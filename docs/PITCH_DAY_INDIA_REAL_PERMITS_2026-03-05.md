# India Real Permit Snapshot (Pitch Day)

Date prepared: March 5, 2026
Source: Official PARIVESH state EC portal (`environmentclearance.nic.in`)

## What was synced

Command run:

```bash
GLOBAL_PENDING_INCLUDE_NON_FARM=true \
INDIA_PENDING_MAX_STATES=36 \
INDIA_PENDING_MAX_LINKS_PER_STATE=12 \
INDIA_PENDING_MAX_RECORDS=1000 \
INDIA_PENDING_LOOKBACK_DAYS=3650 \
npm run sync:global-pending-permits
```

Sync result summary:

- Total deduped records: `338`
- India records from PARIVESH: `46`
- Newly inserted this run: `44`
- Updated this run: `294`

## India records in database (current)

- Total India permits in DB: `46`
- Status: all stored as `pending` (actionable review state)
- Primary type mix (from title/activity classification):
  - `industrial_infra`: 42
  - `other`: 4

## Verified examples (real, official source-linked)

1. **M/s Dhigvijay Minerals**  
   - External ID: `SIA/AP/MIN/76850/2018`  
   - Location: Bethamcherla, Kurnool, Andhra Pradesh  
   - Source URL: https://environmentclearance.nic.in/online_track_proposal_state.aspx?role=6e7jGHCsjC90mY7X/ca5G7TR8I294MaGOSgyGur5tJk=&type=q5weavCpROBMFZHgndEFyg==&status=mELirpUhRYksFj7k8/XBcQ==&statename=Andhra

2. **Quartz, Feldspar & Mica Mine (MLNo-275/05)**  
   - External ID: `SIA/RJ/MIN/68997/2004`  
   - Location: Asind, Bhilwara, Rajasthan  
   - Source URL: https://environmentclearance.nic.in/online_track_proposal_state.aspx?role=6e7jGHCsjC90mY7X/ca5G7TR8I294MaGOSgyGur5tJk=&type=q5weavCpROBMFZHgndEFyg==&status=mELirpUhRYksFj7k8/XBcQ==&statename=Rajasthan

3. **M/S. ORGO SYSTH**  
   - External ID: `SIA/GJ/IND2/65339/2007`  
   - Location: Surat City, Surat, Gujarat  
   - Source URL: https://environmentclearance.nic.in/online_track_proposal_state.aspx?role=HQURDg29zAve7X776VbImxMBzBaHeXr9Hw1z6VcmOGc=&type=q5weavCpROBMFZHgndEFyg==&status=mELirpUhRYksFj7k8/XBcQ==&statename=Gujarat

4. **M/s. Advance Dyestuff Industries**  
   - External ID: `SIA/GJ/IND3/67396/2021`  
   - Location: Daskroi, Ahmedabad, Gujarat  
   - Source URL: https://environmentclearance.nic.in/online_track_proposal_state.aspx?role=HQURDg29zAve7X776VbImxMBzBaHeXr9Hw1z6VcmOGc=&type=q5weavCpROBMFZHgndEFyg==&status=mELirpUhRYksFj7k8/XBcQ==&statename=Gujarat

5. **Expansion of Grain based Distillery from 30 KLPD to 58 KLPD**  
   - External ID: `SIA/MH/IND2/69773/2018`  
   - Location: Shirala, Sangli, Maharashtra  
   - Source URL: https://environmentclearance.nic.in/online_track_proposal_state.aspx?role=K2lfPV1afPrgm+/GxhqQoGI6D7sfbusaRFfdOokfM5U=&type=q5weavCpROBMFZHgndEFyg==&status=mELirpUhRYksFj7k8/XBcQ==&statename=Maharashtra

6. **Proposed Expansion of Multi Specialty Hospital and Research Institute Building**  
   - External ID: `SIA/TN/MIS/31479/2016`  
   - Location: Tamil Nadu  
   - Source URL: https://environmentclearance.nic.in/online_track_proposal_state.aspx?role=HQURDg29zAve7X776VbImxMBzBaHeXr9Hw1z6VcmOGc=&type=q5weavCpROBMFZHgndEFyg==&status=mELirpUhRYksFj7k8/XBcQ==&statename=Tamil

7. **Tvl.Ramalingam Construction Company Private Limited, Gravel Quarry**  
   - External ID: `SIA/TN/MIN/35915/2019`  
   - Location: Dharapuram, Tiruppur, Tamil Nadu  
   - Source URL: https://environmentclearance.nic.in/online_track_proposal_state.aspx?role=HQURDg29zAve7X776VbImxMBzBaHeXr9Hw1z6VcmOGc=&type=q5weavCpROBMFZHgndEFyg==&status=mELirpUhRYksFj7k8/XBcQ==&statename=Tamil

8. **Pappankulam white Granite Quarry**  
   - External ID: `SIA/TN/MIN/40956/2018`  
   - Location: Ambasamudram, Tirunelveli, Tamil Nadu  
   - Source URL: https://environmentclearance.nic.in/online_track_proposal_state.aspx?role=K2lfPV1afPrgm+/GxhqQoGI6D7sfbusaRFfdOokfM5U=&type=q5weavCpROBMFZHgndEFyg==&status=mELirpUhRYksFj7k8/XBcQ==&statename=Tamil

9. **Amtex Dye Chem Industries**  
   - External ID: `SIA/GJ/IND2/19784/2017`  
   - Location: Daskroi, Ahmedabad, Gujarat  
   - Source URL: https://environmentclearance.nic.in/online_track_proposal_state.aspx?role=HQURDg29zAve7X776VbImxMBzBaHeXr9Hw1z6VcmOGc=&type=q5weavCpROBMFZHgndEFyg==&status=mELirpUhRYksFj7k8/XBcQ==&statename=Gujarat

10. **proposed expansion of sugar plant capacity from 5000 TCD to 10000 TCD**  
   - External ID: `SIA/KA/IND2/22040/2018`  
   - Location: Bilgi, Bagalkot, Karnataka  
   - Source URL: https://environmentclearance.nic.in/online_track_proposal_state.aspx?role=HQURDg29zAve7X776VbImxMBzBaHeXr9Hw1z6VcmOGc=&type=q5weavCpROBMFZHgndEFyg==&status=mELirpUhRYksFj7k8/XBcQ==&statename=Karnataka

11. **Pioneer Torsteel Mills Private Limited**  
   - External ID: `SIA/AP/MIN/38856/2019`  
   - Location: Nambulapulakunta, Anantapur, Andhra Pradesh  
   - Source URL: https://environmentclearance.nic.in/online_track_proposal_state.aspx?role=Udhvvcw6JcBljO82xy93snSdWF61jPsQC3cAfVgjULY=&type=q5weavCpROBMFZHgndEFyg==&status=mELirpUhRYksFj7k8/XBcQ==&statename=Andhra

12. **Expansion of Technopark Phase III**  
   - External ID: `SIA/KL/MIS/52532/2019`  
   - Location: Thiruvananthapuram, Kerala  
   - Source URL: https://environmentclearance.nic.in/online_track_proposal_state.aspx?role=Udhvvcw6JcBljO82xy93snSdWF61jPsQC3cAfVgjULY=&type=q5weavCpROBMFZHgndEFyg==&status=mELirpUhRYksFj7k8/XBcQ==&statename=Kerala

## Quick demo plan for meeting

1. Log in to Open Permit.
2. Open permits list and set country context to India.
3. Open any record above and show:
   - external proposal ID,
   - project/location,
   - source URL,
   - original source payload.
4. Click source link live to prove traceability to official PARIVESH route.

## Important note for narration

Current India pipeline is from official PARIVESH pending EC proposals. This dataset is mostly industrial/mining/infrastructure clearances, not factory-farm dominant. Use this transparently in pitch: "India ingestion is live and verified; factory-farm specific India sources are next expansion track."
