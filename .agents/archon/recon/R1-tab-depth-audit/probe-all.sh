#!/bin/sh
# READ-ONLY. GET every distinct /api path the views reference, record HTTP code.
# Path params (:p) are filled with a literal placeholder so the router still matches.
cd /c/Clinic_MVP/dental-crm || exit 1
cut -f2 .agents/archon/recon/R1-tab-depth-audit/view-api-flat.txt | sort -u | while IFS= read -r p; do
  probe=$(printf '%s' "$p" | sed 's/:p/00000000-0000-0000-0000-000000000000/g')
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 8 "http://127.0.0.1:4100$probe")
  printf '%s\t%s\n' "$code" "$p"
done
