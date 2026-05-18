#!/usr/bin/env node
/**
 * Regenerate .claude/board.md from individual task files.
 * Run after bulk task updates to sync the board index.
 *
 * Usage: node scripts/regen-board.cjs
 */

const fs = require('fs');
const path = require('path');

const TASKS_DIR = path.join(__dirname, '..', '.claude', 'tasks');
const BOARD_PATH = path.join(__dirname, '..', '.claude', 'board.md');

// Parse all task files
const files = fs.readdirSync(TASKS_DIR).filter(f => f.endsWith('.md')).sort();
const tasks = [];

for (const file of files) {
  const content = fs.readFileSync(path.join(TASKS_DIR, file), 'utf-8');
  const titleMatch = content.match(/^# (T-\S+)\s*\|\s*(.+)$/m);
  if (!titleMatch) continue;

  const task = { id: titleMatch[1], title: titleMatch[2].trim(), fields: {} };
  const fieldRegex = /^- \*\*(\w[\w\s]*):\*\*\s*(.*)$/gm;
  let match;
  while ((match = fieldRegex.exec(content)) !== null) {
    task.fields[match[1].trim()] = match[2].trim();
  }
  tasks.push(task);
}

// Group by phase and section
const phaseOrder = ['1', '2', '3', '4'];
const phaseMap = new Map();
for (const task of tasks) {
  const phase = task.fields['Phase'] || '?';
  if (!phaseMap.has(phase)) phaseMap.set(phase, new Map());
  const sections = phaseMap.get(phase);
  const sec = task.fields['Section'] || 'Other';
  if (!sections.has(sec)) sections.set(sec, []);
  sections.get(sec).push(task);
}

// Phase titles
const phaseTitles = {
  '1': 'Phase 1: Configuration System + Mobile Optimization',
  '2': 'Phase 2: API Adapter Layer + Real Node Integration',
  '3': 'Phase 3: Full Real Node Integration',
  '4': 'Phase 4: Production Readiness',
};

// Build board
const board = [];
board.push('# TWIN Vietnam Demo: Task Board');
board.push('');
board.push('> This file is the index. Each task has its own file in `.claude/tasks/{id}.md`.');
board.push('> Agents update individual task files for concurrency safety. Regenerate with `node scripts/regen-board.cjs`.');
board.push('');
board.push('## Quick Summary');
board.push('');
board.push('| Phase | Total | Backlog | In Progress | Blocked | Done |');
board.push('|-------|-------|---------|-------------|---------|------|');

const statusCounts = {};
for (const task of tasks) {
  const phase = task.fields['Phase'] || '?';
  const status = (task.fields['Status'] || 'backlog').toLowerCase().replace(' ', '_');
  if (!statusCounts[phase]) statusCounts[phase] = { total: 0, backlog: 0, in_progress: 0, blocked: 0, done: 0 };
  statusCounts[phase].total++;
  statusCounts[phase][status] = (statusCounts[phase][status] || 0) + 1;
}

const grandTotal = { total: 0, backlog: 0, in_progress: 0, blocked: 0, done: 0 };
for (const phase of phaseOrder) {
  const counts = statusCounts[phase] || { total: 0, backlog: 0, in_progress: 0, blocked: 0, done: 0 };
  board.push(`| ${phase}     | ${counts.total}    | ${counts.backlog}      | ${counts.in_progress}           | ${counts.blocked}       | ${counts.done}    |`);
  for (const k of Object.keys(grandTotal)) grandTotal[k] += counts[k];
}
board.push(`| **Total** | **${grandTotal.total}** | **${grandTotal.backlog}** | **${grandTotal.in_progress}** | **${grandTotal.blocked}** | **${grandTotal.done}** |`);
board.push('');
board.push('---');
board.push('');

// Phase sections with task tables
for (const phase of phaseOrder) {
  const sections = phaseMap.get(phase);
  if (!sections) continue;

  board.push(`## ${phaseTitles[phase] || 'Phase ' + phase}`);
  board.push('');

  for (const [section, sectionTasks] of sections) {
    if (section !== 'Other') {
      board.push(`### ${section}`);
      board.push('');
    }
    board.push('| ID | Title | Priority | Status | Dependencies |');
    board.push('|----|-------|----------|--------|--------------|');
    for (const t of sectionTasks) {
      const deps = t.fields['Dependencies'] || 'none';
      const status = t.fields['Status'] || 'backlog';
      const priority = t.fields['Priority'] || '?';
      board.push(`| [${t.id}](tasks/${t.id}.md) | ${t.title} | ${priority} | ${status} | ${deps} |`);
    }
    board.push('');
  }
  board.push('---');
  board.push('');
}

// Critical path
board.push('## Critical Path');
board.push('');
board.push('```');
board.push('Phase 1 (two parallel workstreams):');
board.push('');
board.push('Config:  T-101 -> T-102 -> T-104 -> T-105/T-106 -> T-109 -> T-111 -> T-113/T-114/T-116 -> T-143 -> T-144 -> T-145');
board.push('Mobile:  T-121/T-122/T-123/T-124 -> T-125 -> T-126 -> T-127 -> T-128 -> T-146');
board.push('Theming: T-118 -> T-119 -> T-120');
board.push('');
board.push('Phase 2:');
board.push('Infra:   T-201 -> T-202/T-203 -> T-204');
board.push('Adapter: T-205 -> T-206 -> T-207 -> T-210 -> T-211 -> T-213');
board.push('Notarize:                          T-214 -> T-215 -> T-216');
board.push('Testing:                                              T-221 -> T-222');
board.push('');
board.push('Phase 3:');
board.push('DSC:     T-301 -> T-302 -> T-308');
board.push('AIG:     T-303 ----^');
board.push('ODRL:    T-304 ----^');
board.push('');
board.push('Phase 4:');
board.push('Auth:    T-401 -> T-404');
board.push('Persist: T-402 -> T-405 -> T-406');
board.push('Audit:   T-407');
board.push('```');
board.push('');

// Risk register
board.push('## Risk Register (Vietnam-Specific)');
board.push('');
board.push('| ID | Risk | Probability | Impact | Mitigation |');
board.push('|----|------|------------|--------|------------|');
board.push('| RV-01 | eCoSys API unavailable | HIGH | HIGH | Manual upload fallback from day one |');
board.push('| RV-02 | VNACCS API unavailable | HIGH | HIGH | Manual fallback, research third-party access precedent |');
board.push('| RV-03 | Vietnam Cybersecurity Law forces local hosting | MEDIUM | HIGH | Design location-agnostic adapter, evaluate Vietnamese clouds early |');
board.push('| RV-04 | MOIT C/O format incompatible with UNECE D23B | MEDIUM | MEDIUM | Request sample from T9, fallback to OCR if PDF-only |');
board.push('| RV-05 | Two-channel confusion at destination customs | LOW | HIGH | Document clearly, include eCoSys C/O reference in TWIN data |');
board.push('| RV-06 | Named pilot manufacturer not confirmed | MEDIUM | MEDIUM | Config system makes switching a 30-minute task |');
board.push('| RV-07 | Vietnamese diacritics rendering issues | LOW | MEDIUM | UTF-8 test cases in Phase 1 |');
board.push('| RV-08 | MLETR not adopted in Vietnam | MEDIUM | LOW (pilot) | Display "simulation mode" indicator |');
board.push('| RV-09 | Origin composition thresholds unknown | MEDIUM | MEDIUM | Make calculator fully configurable |');
board.push('| RV-10 | ASW 2.0 evolves conflicting standards | LOW | MEDIUM | Monitor via Nitas Polachai, adapter pattern supports format transformation |');
board.push('');

fs.writeFileSync(BOARD_PATH, board.join('\n'));
console.log(`Regenerated board.md (${tasks.length} tasks)`);
