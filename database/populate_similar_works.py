import sqlite3
import datetime
import re

def normalize_text(text):
    if not text:
        return ""
    # Strip common prefixes like 'NA -' or punctuation
    t = re.sub(r'^(NA\s*-\s*|na\s*-\s*)', '', text.strip(), flags=re.IGNORECASE)
    t = re.sub(r'[^\w\s]', ' ', t).lower()
    return ' '.join(t.split())

def run_detection():
    conn = sqlite3.connect('database/mplads_risk.db')
    cursor = conn.cursor()

    print("Fetching works grouped by state & constituency...")
    # Fetch works that share state, constituency and have meaningful work titles
    cursor.execute("""
        SELECT project_id, work, category, state, constituency, block, village, 
               allocation_amount, recommended_date, mp_name, status, hybrid_risk_score, hybrid_risk_level
        FROM works
        WHERE state IS NOT NULL AND constituency IS NOT NULL AND work IS NOT NULL AND work != '' AND work != 'Unknown'
    """)
    rows = cursor.fetchall()
    print(f"Total candidate rows: {len(rows)}")

    # Group by (state, constituency) to avoid cross-state comparisons and ensure high performance
    by_constituency = {}
    for r in rows:
        key = (r[3], r[4])
        if key not in by_constituency:
            by_constituency[key] = []
        by_constituency[key].append(r)

    print(f"Total geographic clusters (state, constituency): {len(by_constituency)}")

    candidate_pairs = []
    seen_pairs = set()

    for (state, constituency), works in by_constituency.items():
        if len(works) < 2:
            continue
        
        # Sub-index works by normalized work words to avoid N^2
        work_groups = {}
        for w in works:
            norm = normalize_text(w[1])
            if not norm or len(norm) < 5:
                continue
            if norm not in work_groups:
                work_groups[norm] = []
            work_groups[norm].append(w)

        # 1. Exact or near-exact work title matches within same constituency
        for norm, group in work_groups.items():
            if len(group) > 1:
                sample_group = group[:15]
                for i in range(len(sample_group)):
                    for j in range(i + 1, len(sample_group)):
                        w1 = sample_group[i]
                        w2 = sample_group[j]
                        pair_key = tuple(sorted([w1[0], w2[0]]))
                        if pair_key in seen_pairs:
                            continue
                        seen_pairs.add(pair_key)

                        score = 45 # base for exact text match in same constituency
                        reasons = ["Identical work description in same constituency"]

                        # Check MP
                        if w1[9] and w2[9] and w1[9].lower() == w2[9].lower():
                            score += 15
                            reasons.append(f"Same MP ({w1[9]})")

                        # Check Block & Village
                        same_block = (w1[5] and w2[5] and w1[5] != 'Unknown' and w1[5].lower() == w2[5].lower())
                        same_village = (w1[6] and w2[6] and w1[6] != 'Unknown' and w1[6].lower() == w2[6].lower())

                        if same_block:
                            score += 15
                            reasons.append(f"Same Block ({w1[5]})")
                        if same_village:
                            score += 15
                            reasons.append(f"Same Village ({w1[6]})")

                        # Check allocation proximity
                        a1, a2 = w1[7] or 0, w2[7] or 0
                        if a1 > 0 and a2 > 0:
                            ratio = min(a1, a2) / max(a1, a2)
                            if ratio >= 0.95:
                                score += 10
                                reasons.append(f"Allocation match (₹{a1/100000:.1f}L vs ₹{a2/100000:.1f}L)")
                            elif ratio >= 0.80:
                                score += 5
                                reasons.append("Similar allocation (within 20%)")

                        # Check date proximity
                        d1_str, d2_str = w1[8], w2[8]
                        if d1_str and d2_str:
                            try:
                                d1 = datetime.datetime.strptime(d1_str[:10], '%Y-%m-%d')
                                d2 = datetime.datetime.strptime(d2_str[:10], '%Y-%m-%d')
                                diff_days = abs((d1 - d2).days)
                                if diff_days <= 14:
                                    score += 10
                                    reasons.append(f"Recommended within {diff_days} days")
                                elif diff_days <= 60:
                                    score += 5
                                    reasons.append(f"Recommended within {diff_days} days")
                            except Exception:
                                pass

                        final_score = min(98, score)
                        if final_score >= 65:
                            candidate_pairs.append({
                                'project_a_id': w1[0],
                                'project_b_id': w2[0],
                                'similarity_score': final_score,
                                'similarity_reasons': ' | '.join(reasons),
                                'state': state,
                                'constituency': constituency,
                                'location_block': w1[5] if w1[5] != 'Unknown' else (w2[5] if w2[5] != 'Unknown' else None),
                                'location_village': w1[6] if w1[6] != 'Unknown' else (w2[6] if w2[6] != 'Unknown' else None),
                                'mp_name': w1[9] or w2[9],
                                'allocation_a': a1,
                                'allocation_b': a2
                            })

    print(f"Found {len(candidate_pairs)} candidate similar work pairs.")
    candidate_pairs.sort(key=lambda x: x['similarity_score'], reverse=True)
    selected_pairs = candidate_pairs[:1500]

    cursor.execute("DELETE FROM similar_works")
    insert_sql = """
        INSERT INTO similar_works (
            project_a_id, project_b_id, similarity_score, similarity_reasons,
            state, constituency, location_block, location_village, mp_name,
            allocation_a, allocation_b, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'REQUIRES_VERIFICATION')
    """
    for p in selected_pairs:
        cursor.execute(insert_sql, (
            p['project_a_id'], p['project_b_id'], p['similarity_score'], p['similarity_reasons'],
            p['state'], p['constituency'], p['location_block'], p['location_village'], p['mp_name'],
            p['allocation_a'], p['allocation_b']
        ))

    conn.commit()
    cursor.execute("SELECT COUNT(*), AVG(similarity_score), MIN(similarity_score), MAX(similarity_score) FROM similar_works")
    stats = cursor.fetchone()
    print(f"Successfully inserted {stats[0]} similar work pairs! Avg score: {stats[1]:.1f}, Range: {stats[2]}-{stats[3]}")
    conn.close()

if __name__ == '__main__':
    run_detection()
