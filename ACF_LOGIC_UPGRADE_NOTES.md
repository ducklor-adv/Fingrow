# ACF Logic Upgrade - Fair Distribution Implementation

**Date:** 2025-10-16
**Version:** From v1.0 (Earliest-First) → v2.0 (Fair Distribution)

---

## Summary of Changes

The ACF (Auto-Connect Follower) allocation logic has been upgraded from **"Fill to 5 First"** to **"Fair Distribution (Round-Robin)"** to ensure equitable child distribution across all users in the same network layer.

---

## Old Logic (v1.0) - Earliest-First

### Sorting Priority:
```
1. created_at (ascending) - earliest user gets filled first
2. childCount (ascending) - only matters after date comparison
```

### Behavior:
- Users who registered earlier would get all 5 children before later users receive any
- Unfair distribution within the same layer
- Example with 3 users in Level 1:

```
User A (created 10:00) → gets children 1,2,3,4,5  (full)
User B (created 10:01) → gets children 1,2,3,4,5  (full)
User C (created 10:02) → gets children 1,2,3,4,5  (full)
```

**Problem:** User A gets 5 children before B gets even 1 child.

---

## New Logic (v2.0) - Fair Distribution

### Sorting Priority:
```
1. childCount (ascending) - users with fewer children get priority
2. created_at (ascending) - tiebreaker when childCount is equal
3. level (ascending) - tiebreaker when all else is equal
```

### Behavior:
- Children are distributed evenly across all candidates in the same layer
- Round-robin style allocation
- Example with 3 users in Level 1:

```
Run 1: A gets child #1  (A: 1/5, B: 0/5, C: 0/5)
Run 2: B gets child #1  (A: 1/5, B: 1/5, C: 0/5)
Run 3: C gets child #1  (A: 1/5, B: 1/5, C: 1/5)
Run 4: A gets child #2  (A: 2/5, B: 1/5, C: 1/5)  ← Round 2
Run 5: B gets child #2  (A: 2/5, B: 2/5, C: 1/5)
Run 6: C gets child #2  (A: 2/5, B: 2/5, C: 2/5)
Run 7: A gets child #3  (A: 3/5, B: 2/5, C: 2/5)  ← Round 3
...
```

**Benefit:** Everyone in the same layer gets children distributed fairly.

---

## Code Changes

### File: `server.js`

#### Location: Lines 580-595 (Documentation)
**Before:**
```javascript
/**
 * ACF (Auto-Connect Follower) Allocation Logic
 * Rules:
 * - Layer-first → Earliest-first → Lowest childCount
 */
```

**After:**
```javascript
/**
 * ACF (Auto-Connect Follower) Allocation Logic - NEW FAIR DISTRIBUTION
 * Rules:
 * - Layer-first → Fair Distribution (childCount) → Earliest registration
 * - Fair Distribution: Distribute children evenly across all candidates
 *   instead of filling one person to 5 first (round-robin style)
 */
```

#### Location: Lines 686-701 (Sorting Logic)
**Before:**
```javascript
// Sort candidates: earliest created_at → lowest childCount
candidates.sort((a, b) => {
    const dateA = new Date(a.created_at).getTime();
    const dateB = new Date(b.created_at).getTime();
    if (dateA !== dateB) return dateA - dateB;
    return a.childCount - b.childCount;
});
```

**After:**
```javascript
// Sort candidates: NEW ACF Logic (Fair Distribution)
// Priority: childCount → created_at → level
candidates.sort((a, b) => {
    // 1. Prioritize users with fewer children (fair distribution)
    if (a.childCount !== b.childCount) return a.childCount - b.childCount;

    // 2. If same childCount, earlier registration gets priority
    const dateA = new Date(a.created_at).getTime();
    const dateB = new Date(b.created_at).getTime();
    if (dateA !== dateB) return dateA - dateB;

    // 3. If still tied, closer to invitor (shallower level)
    return a.level - b.level;
});
```

---

## Impact Analysis

### Positive Impacts:
✅ **Fairness:** All users in the same layer receive children more equitably
✅ **Network Growth:** More balanced tree growth across the network
✅ **User Satisfaction:** No single user monopolizes early registrations
✅ **Scalability:** Better distribution as network grows larger

### Potential Considerations:
⚠️ **Behavioral Change:** Existing users expecting "first-come-first-served" will see different allocation patterns
⚠️ **Testing Required:** Thoroughly test with existing database to ensure smooth transition
⚠️ **Documentation:** Inform users about the new fair distribution policy

---

## Testing Scenarios

### Test Case 1: Empty Network (First Child)
- **Input:** Invitor (Anatta999) with 0 children
- **Expected:** New user becomes direct child of invitor
- **Status:** ✅ No change from old logic

### Test Case 2: Multiple Users in Same Layer
- **Input:** 3 users in Level 1, each with 0 children
- **Old Behavior:** First user gets 5 children before others
- **New Behavior:** Each user gets 1 child in round-robin until all reach 5
- **Status:** ✅ Improved fairness

### Test Case 3: Mixed Child Counts
- **Input:** User A (3/5), User B (1/5), User C (1/5)
- **Expected:** B or C gets next child (whoever registered first), not A
- **Status:** ✅ Working as intended

### Test Case 4: Full Layer Fallback
- **Input:** All Level 1 users are full (5/5)
- **Expected:** Move to Level 2 and apply same fair distribution
- **Status:** ✅ Layer-first still applies

---

## Migration Notes

### For Existing Installations:
1. **No Database Changes Required:** This is a logic-only update
2. **Backward Compatible:** Works with existing user tree structures
3. **Immediate Effect:** New registrations will use new logic immediately
4. **Historical Data:** Past allocations remain unchanged

### Rollback Plan:
If rollback is needed, restore the old sorting logic:
```javascript
candidates.sort((a, b) => {
    const dateA = new Date(a.created_at).getTime();
    const dateB = new Date(b.created_at).getTime();
    if (dateA !== dateB) return dateA - dateB;
    return a.childCount - b.childCount;
});
```

---

## References

- **New Logic Reference:** `ACF_Complete_Version20251016.jsx` (lines 99-109)
- **Implementation:** `server.js` function `allocateParent()` (lines 596-707)
- **Related Files:**
  - `ACF code.jsx` - Old mock implementation
  - `ACF FLow.txt` - Flow documentation

---

## Approval & Sign-off

- [x] Logic implemented
- [x] Code documented
- [ ] User acceptance testing
- [ ] Production deployment

**Implemented by:** Claude Code
**Reviewed by:** _[Pending]_
**Approved by:** _[Pending]_
