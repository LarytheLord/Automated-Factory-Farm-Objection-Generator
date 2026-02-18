const {
  normalizeStatus,
  mapRecordToPermit,
  readSourcePermits,
  syncPermitSources,
} = require('../backend/permitIngestion');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function run() {
  assert(normalizeStatus('Application Received') === 'Pending', 'status mapping failed for pending');
  assert(normalizeStatus('Permit Issued') === 'Approved', 'status mapping failed for approved');
  assert(normalizeStatus('Denied') === 'Rejected', 'status mapping failed for rejected');
  assert(normalizeStatus('Withdrawn by applicant') === 'Withdrawn', 'status mapping failed for withdrawn');

  const mapped = mapRecordToPermit(
    {
      APP_ID: 'NC-1001',
      FACILITY_NAME: 'Delta Hog Site',
      ADDRESS: '123 Farm Lane',
      CITY: 'Raleigh',
      PROGRAM: 'Animal Operations',
      STATUS: 'In Process',
    },
    {
      defaults: { country: 'United States', category: 'Unknown' },
      field_map: {
        external_id: 'APP_ID',
        project_title: 'FACILITY_NAME',
        location: ['ADDRESS', 'CITY'],
        activity: 'PROGRAM',
        status: 'STATUS',
      },
    }
  );

  assert(mapped.external_id === 'NC-1001', 'field map external_id failed');
  assert(mapped.location === '123 Farm Lane, Raleigh', 'field map array join failed');
  assert(mapped.country === 'United States', 'default country fallback failed');

  const arcgisSource = {
    key: 'nc_deq',
    name: 'NC DEQ',
    enabled: true,
    type: 'arcgis_mapserver',
    url: 'https://example.org/arcgis/query',
    query: { where: '1=1', outFields: '*' },
    field_map: {
      external_id: 'APP_ID',
      project_title: 'FACILITY_NAME',
      location: ['ADDRESS', 'CITY'],
      country: 'COUNTRY',
      activity: 'PROGRAM',
      status: 'STATUS',
      notes: 'NOTES',
    },
    defaults: {
      country: 'United States',
      category: 'Unknown',
    },
  };

  let fetchCalls = 0;
  const mockFetch = async (url) => {
    fetchCalls += 1;
    assert(url.includes('where=1%3D1'), 'arcgis query params missing');

    const payload =
      fetchCalls === 1
        ? {
            features: [
              {
                attributes: {
                  APP_ID: 'NC-2001',
                  FACILITY_NAME: 'Carolina Poultry Unit',
                  ADDRESS: '45 Farm Road',
                  CITY: 'Durham',
                  COUNTRY: 'United States',
                  PROGRAM: 'Animal Operations',
                  STATUS: 'In Process',
                  NOTES: 'Public hearing scheduled',
                },
              },
            ],
          }
        : {
            features: [
              {
                attributes: {
                  APP_ID: 'NC-2001',
                  FACILITY_NAME: 'Carolina Poultry Unit',
                  ADDRESS: '45 Farm Road',
                  CITY: 'Durham',
                  COUNTRY: 'United States',
                  PROGRAM: 'Animal Operations',
                  STATUS: 'Permit Issued',
                  NOTES: 'Decision made',
                },
              },
            ],
          };

    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => payload,
    };
  };

  const firstRead = await readSourcePermits(arcgisSource, __dirname, mockFetch);
  assert(Array.isArray(firstRead) && firstRead.length === 1, 'arcgis read did not return one record');
  assert(firstRead[0].external_id === 'NC-2001', 'arcgis mapping external_id mismatch');

  const ingestedPermits = [];
  const statusHistory = [];
  const ingestionRuns = [];

  const firstRun = await syncPermitSources({
    sources: [arcgisSource],
    ingestedPermits,
    statusHistory,
    ingestionRuns,
    fetchImpl: mockFetch,
    now: new Date('2026-02-18T10:00:00Z'),
  });

  assert(firstRun.run.inserted === 1, 'first arcgis sync should insert one permit');
  assert(ingestedPermits[0].status === 'Approved', 'status normalization to Approved failed after second fetch payload');

  const secondRun = await syncPermitSources({
    sources: [arcgisSource],
    ingestedPermits,
    statusHistory,
    ingestionRuns,
    fetchImpl: mockFetch,
    now: new Date('2026-02-18T11:00:00Z'),
  });

  assert(secondRun.run.updated === 1, 'second arcgis sync should update one permit');
  assert(secondRun.run.status_changed === 0, 'status change should not fire when status unchanged');
  assert(statusHistory.length === 0, 'status history should remain empty when no status transition');

  const failingFetch = async () => ({ ok: false, status: 503, statusText: 'Service Unavailable', json: async () => ({}) });
  const failedRun = await syncPermitSources({
    sources: [arcgisSource],
    ingestedPermits: [],
    statusHistory: [],
    ingestionRuns: [],
    fetchImpl: failingFetch,
  });
  assert(failedRun.run.errors === 1, 'failing source should be reported as run error');

  console.log('phase5 source connector tests passed');
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
