# India Factory-Farm Pending Permits (Pitch Snapshot)

Prepared on: **March 6, 2026**

## What was done

We ingested real India farm-related pending permits from the official OCMMS portal:

- Source: `https://ocmms.nic.in/OCMMS_NEW/searchStatus.jsp`
- Source key used in permit notes: `in_ocmms_pending_consent`
- Sync script: `backend/scripts/sync-india-ocmms-farm-pending-to-supabase.js`

Command used:

```bash
INDIA_OCMMS_MAX_STATES=10 \
INDIA_OCMMS_MAX_DISTRICTS_PER_STATE=40 \
INDIA_OCMMS_MAX_RECORDS=200 \
INDIA_OCMMS_YEAR_FROM=2016 \
INDIA_OCMMS_YEAR_TO=2026 \
npm run sync:india-ocmms-farm-pending
```

## Result summary

- India OCMMS farm pending matched: **129**
- Inserted: **111**
- Updated: **18**
- Current India farm-like permits in DB: **111** (all from official OCMMS source key)
- Recipient email coverage for India farm-like permits: **100%**

## Pitch-ready real examples

1. **ERNAKULAM REGIONAL COOPERATIVE MILK PRODUCERS UNION LTD, THRISSUR DAIRY**
   - Location: THRISSUR, Kerala
   - External ID: 18804731
   - Source URL: https://ocmms.nic.in/OCMMS_NEW/getDataPending.action?application=pending&district=THRISSUR&state=Kerala&status=consent&yearFrom=2016&yearTo=2026

2. **ROYAL DAIRY ICE CREAM**
   - Location: KOLLAM, Kerala
   - External ID: 18885946
   - Source URL: https://ocmms.nic.in/OCMMS_NEW/getDataPending.action?application=pending&district=KOLLAM&state=Kerala&status=consent&yearFrom=2016&yearTo=2026

3. **J V POULTRY FARMS**
   - Location: YADADRI, Telangana
   - External ID: 6365028
   - Source URL: https://ocmms.nic.in/OCMMS_NEW/getDataPending.action?application=pending&district=YADADRI&state=Telangana&status=consent&yearFrom=2016&yearTo=2026

4. **M/s.Sabitha Poultry Farm**
   - Location: WARANGAL URBAN, Telangana
   - External ID: 2867893
   - Source URL: https://ocmms.nic.in/OCMMS_NEW/getDataPending.action?application=pending&district=WARANGAL%20URBAN&state=Telangana&status=consent&yearFrom=2016&yearTo=2026

5. **SRI ANJAN POULTRY FARM**
   - Location: WARANGAL RURAL, Telangana
   - External ID: 1327186
   - Source URL: https://ocmms.nic.in/OCMMS_NEW/getDataPending.action?application=pending&district=WARANGAL%20RURAL&state=Telangana&status=consent&yearFrom=2016&yearTo=2026

6. **LUCKY POULTRY FARM (ALLAGADAPA MURALI & ALLAGADAPA RAJINI)**
   - Location: SURYAPET, Telangana
   - External ID: 6225310
   - Source URL: https://ocmms.nic.in/OCMMS_NEW/getDataPending.action?application=pending&district=SURYAPET&state=Telangana&status=consent&yearFrom=2016&yearTo=2026

7. **DIAMOND POULTRY FARM**
   - Location: BARNALA, Punjab
   - Source URL: https://ocmms.nic.in/OCMMS_NEW/getDataPending.action?application=pending&district=BARNALA&state=Punjab&status=consent&yearFrom=2016&yearTo=2026

8. **Guru Nanak Dairy**
   - Location: SAS NAGAR, Punjab
   - Source URL: https://ocmms.nic.in/OCMMS_NEW/getDataPending.action?application=pending&district=SAS%20NAGAR&state=Punjab&status=consent&yearFrom=2016&yearTo=2026

## 60-second demo flow for funders

1. Open dashboard and filter to **Country = India**.
2. Select a permit with poultry/dairy in title.
3. Show source metadata block (Source Key + Source URL + External ID).
4. Open source URL directly to show it comes from official OCMMS pending registry.

## Important transparency line for pitch

Use this exact line:

> "For India we currently ingest two official channels: PARIVESH pending EC proposals and OCMMS pending consent records. The farm-heavy India set in this demo is from official OCMMS pending listings."
