# Security Specification - MeterReader Pro v3 Extreme

## 1. Data Invariants
- **Users**: Unique lotNumber + phoneNumber combination. Every user has a 'role'.
- **Readings**: Must belong to a valid user. `readingValue` must be >= `baselineReading`. `netUsage` and `totalCost` must be provided.
- **Admin**: Special access for `Lot: ADMIN` with dedicated UID (though in practice we link it to a specific Auth UID after first login).

## 2. The "Dirty Dozen" Payloads
1. **Identity Theft**: Attempt to create a reading with a different `userId`.
2. **Lot Spoofing**: Attempt to register with a lot number that doesn't match the current authenticated context.
3. **Admin Escalation**: Attempt to set `role: "admin"` on a regular user profile.
4. **Reading Manipulation**: Attempt to set `readingValue` to a negative number or extremely high number.
5. **Baseline Forgery**: Attempt to set a `baselineReading` that is higher than the `readingValue`.
6. **Bypass Verification**: Attempt to save a reading without the `isVerified` flag being true.
7. **Cross-User Leak**: Attempt to list readings of another lot number.
8. **Admin Bypass**: Attempt to access the `/admins` collection as a regular user.
9. **Timestamp Spoofing**: Attempt to send a `timestamp` that is not the server time.
10. **Shadow Update**: Attempt to update an immutable `lotNumber` on a reading.
11. **Orphan Reading**: Attempt to create a reading for a non-existent user.
12. **Anonymous Write**: Attempt to write data without being signed in.

## 3. Test Runner
A `firestore.rules.test.ts` would verify these, but since I cannot run an emulator here, I will rely on the "Red Team" audit and ESLint.
