#!/usr/bin/env python3
"""Render the final CLAUDE-SECURITY-RESULTS.md from findings.json + votes.json."""
import json, os, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
raw = json.load(open(os.path.join(HERE, "findings.json"), encoding="utf-8"))
findings = raw["findings"] if isinstance(raw, dict) and "findings" in raw else raw
votes = json.load(open(os.path.join(HERE, "votes.json"), encoding="utf-8"))

# index findings by key
idx = {}
for f in findings:
    key = f.get("key") or f"{f['file']}:{f['line']}:{f['category']}"
    idx[key] = f

# tally
for key, lst in votes.get("votes", {}).items():
    tally = {"CONFIRMED":0,"REFUTED":0,"UNREVIEWED":0}
    for v in lst:
        tally[v.get("vote","UNREVIEWED")] = tally.get(v.get("vote","UNREVIEWED"),0)+1
    f = idx.get(key)
    if not f:
        continue
    confirmed = tally["CONFIRMED"]
    total = len(lst)
    # decision
    if confirmed == 0:
        decision = "REFUTED"
    elif confirmed >= 2:
        decision = "CONFIRMED"
    elif confirmed == 1 and total == 1:
        decision = "UNREVIEWED"
    else:
        decision = "UNREVIEWED"
    f["_confirmed"] = confirmed
    f["_total"] = total
    f["_decision"] = decision

# unreviewed list
for key in votes.get("unreviewed", []):
    f = idx.get(key)
    if f:
        f["_decision"] = "UNREVIEWED"
        f["_confirmed"] = 0
        f["_total"] = 0

order = {"critical":0,"high":1,"medium":2,"low":3,"info":4}
findings.sort(key=lambda f:(order.get(f["severity"],9), f.get("_confirmed",0)))

tier = votes.get("tier","max")
cats = votes.get("categories","all applicable")

confirmed = [f for f in findings if f.get("_decision")=="CONFIRMED"]
refuted = [f for f in findings if f.get("_decision")=="REFUTED"]
unrev = [f for f in findings if f.get("_decision")=="UNREVIEWED"]

by_sev = {}
for f in confirmed:
    by_sev[f["severity"]] = by_sev.get(f["severity"],0)+1

L = []
L.append("# Claude Security Scan — Final Report")
L.append("")
L.append(f"*Generated: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M')}*  ")
L.append(f"*Tier: `{tier}` · Categories: `{cats}`*")
L.append("")
L.append("## Executive Summary")
L.append("")
L.append(f"- **{len(confirmed)} confirmed** findings, **{len(refuted)} refuted**, **{len(unrev)} unreviewed**.")
L.append(f"- Severity of confirmed: " + ", ".join(f"{k.upper()}={by_sev.get(k,0)}" for k in ["critical","high","medium","low"] if by_sev.get(k,0)) + ".")
L.append("")
L.append("## Confirmed Findings")
L.append("")
for f in confirmed:
    L.append(f"### [{f['severity'].upper()}] {f['id']} — `{f['type']}`")
    L.append("")
    L.append(f"- **Location:** `{f['file']}:{f['line']}`  ")
    L.append(f"- **Category:** {f['category']}  ")
    L.append(f"- **Panel:** {f.get('_confirmed',0)}/{f.get('_total',0)} confirmed")
    L.append("")
    L.append(f['reasoning'])
    det = f.get('details','')
    if det:
        L.append("")
        L.append("**Evidence / Detail**")
        L.append("")
        L.append(det)
    imp = f.get('impact','')
    if imp:
        L.append("")
        L.append("**Impact**")
        L.append("")
        L.append(imp)
    fix = f.get('fix_direction','')
    if fix:
        L.append("")
        L.append("**Suggested Fix**")
        L.append("")
        L.append(fix)
    L.append("")

if refuted:
    L.append("## Refuted During Panel")
    L.append("")
    for f in refuted:
        L.append(f"- **{f['id']}** `{f['file']}:{f['line']}` — {f['title']}")
    L.append("")

if unrev:
    L.append("## Unreviewed")
    L.append("")
    for f in unrev:
        L.append(f"- **{f['id']}** `{f['file']}:{f['line']}` — {f['title']}")
    L.append("")

out = "\n".join(L)
with open(os.path.join(HERE, "CLAUDE-SECURITY-RESULTS.md"), "w", encoding="utf-8") as fh:
    fh.write(out)
print(f"Wrote CLAUDE-SECURITY-RESULTS.md: {len(confirmed)} confirmed, {len(refuted)} refuted, {len(unrev)} unreviewed.")
