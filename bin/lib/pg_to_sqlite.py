#!/usr/bin/env python3
"""
Converts a pg_dump of the old dmx_control Postgres database (plain format, as
written by ../bin/dump) into a SQLite script, printed on stdout.

The schema is hardcoded rather than translated: it mirrors what the Sequelize
sqlite migrations create, plus the columns the Postgres dump still carries.
Only the COPY data blocks and the sequence values are read from the dump.
"""
import re, sys
lines = open(sys.argv[1], encoding='utf-8').read().split('\n')

SCHEMA = """PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;
CREATE TABLE `SequelizeMeta` (`name` VARCHAR(255) NOT NULL UNIQUE PRIMARY KEY);
CREATE TABLE `programs` (`id` INTEGER PRIMARY KEY AUTOINCREMENT, `name` VARCHAR(255), `created_at` DATETIME NOT NULL, `updated_at` DATETIME NOT NULL, `tempo` INTEGER, `bpm` INTEGER NOT NULL DEFAULT 85, `audio_filename` VARCHAR(255));
CREATE TABLE `dmx_buttons` (`id` UUID NOT NULL UNIQUE PRIMARY KEY, `program_id` INTEGER REFERENCES `programs` (`id`) ON DELETE CASCADE ON UPDATE CASCADE, `color` VARCHAR(255) NOT NULL, `duration_ms` INTEGER NOT NULL, `red_channels` JSON NOT NULL DEFAULT '[]', `nature` VARCHAR(255) NOT NULL, `created_at` DATETIME NOT NULL, `updated_at` DATETIME NOT NULL, `triggering_midi_key` INTEGER);
CREATE TABLE `dmx_midis` (`id` UUID NOT NULL UNIQUE PRIMARY KEY, `program_id` INTEGER NOT NULL REFERENCES `programs` (`id`) ON DELETE CASCADE ON UPDATE CASCADE, `midi_patterns` JSON NOT NULL DEFAULT '[]', `created_at` DATETIME NOT NULL, `updated_at` DATETIME NOT NULL);
"""
INT_COLS = {'program_id', 'duration_ms', 'triggering_midi_key', 'tempo', 'bpm'}
TS = re.compile(r'^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?)([+-]\d{2})(?::?(\d{2}))?$')

def unescape(v):
    if v == r'\N': return None
    return re.sub(r'\\(.)', lambda m: {'t':'\t','n':'\n','r':'\r','\\':'\\'}.get(m.group(1), m.group(1)), v)

def conv(table, col, v):
    if v is None: return None
    if col in ('created_at', 'updated_at'):
        m = TS.match(v)
        if m:  # Sequelize sqlite format: 'YYYY-MM-DD HH:MM:SS.SSS +00:00'
            return f"{m.group(1)} {m.group(2)}:{m.group(3) or '00'}"
    if col in INT_COLS or (col == 'id' and table == 'programs'):
        return int(v)
    return v

def lit(v):
    if v is None: return 'NULL'
    if isinstance(v, int): return str(v)
    return "'" + v.replace("'", "''") + "'"

stmts, seqs, i = [], {}, 0
while i < len(lines):
    m = re.match(r'^COPY public\."?(\w+)"? \((.*)\) FROM stdin;$', lines[i])
    s = re.match(r"^SELECT pg_catalog\.setval\('public\.(\w+)_id_seq', (\d+), true\);", lines[i])
    if s: seqs[s.group(1)] = int(s.group(2))
    if m:
        table, cols = m.group(1), [c.strip().strip('"') for c in m.group(2).split(',')]
        i += 1
        while lines[i] != r'\.':
            vals = [conv(table, c, unescape(x)) for c, x in zip(cols, lines[i].split('\t'))]
            stmts.append(f"INSERT INTO `{table}` ({', '.join('`'+c+'`' for c in cols)}) VALUES ({', '.join(map(lit, vals))});")
            i += 1
    i += 1

sql = SCHEMA + '\n'.join(stmts) + '\n'
for t, n in seqs.items():
    sql += f"DELETE FROM sqlite_sequence WHERE name = '{t}';\n"
    sql += f"INSERT INTO sqlite_sequence (name, seq) VALUES ('{t}', {n});\n"
sql += "COMMIT;\nPRAGMA foreign_keys=ON;\n"
sys.stdout.write(sql)
