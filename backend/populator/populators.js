
const { PermitApplication } = require('../db/models');

const populators = {
    'usa': {
        'north carolina': async () => {
            const layer = [0,2,3,4,5]; //0-5
            const res = [];
            for (const l of layer) {
                const url = `https://maps.deq.nc.gov/arcgis/rest/services/DEQ/ApplicationTracker/MapServer/${l}/query?where=1%3D1&outFields=*&f=json&returnGeometry=false&resultOffset=0&resultRecordCount=1000`;
                const response = await fetch(url);
                const jsonData = await response.json();

                const mappedPermits = (jsonData.features || []).map(item => {
                    const attr = item.attributes || {};
                    return {
                        application_number: attr.APP_ID || null,
                        application_date: attr.RECV_DT ? new Date(attr.RECV_DT) : null,
                        project_title: attr.NAME || null,
                        permit_type: attr.PERMIT_TYPE || attr.PROG_CAT || null,
                        permit_grant_body: "North Carolina DEQ",
                        original_url: null,
                        raw_text: null,
                        location: `${attr.ADDRESS ? attr.ADDRESS + ', ' : ''}${attr.CITY ? attr.CITY + ', ' : ''}${attr.STATE || ''} ${attr.ZIP || ''}`.trim(),
                        region: attr.COUNTY || null,
                        country: "USA",
                        activity: attr.APP_TYPE || null,
                        // No capacity, effluent_limit, solid_waste, air_emission_standard in NC DEQ attributes
                        capacity: null,
                        effluent_limit: {},
                        solid_waste: [],
                        air_emission_standard: {},
                        notes: `Status: ${attr.STATUS || 'Unknown'} (Reviewer: ${attr.REVIEWER || 'N/A'}), Applicant: ${attr.APPLICANT || 'N/A'}`,
                        status: attr.STATUS ? attr.STATUS.replace(/\s+/g, '_').toLowerCase() : null
                    };
                });
                res.push(...mappedPermits);
            }

            // Example: log first mapped permit application

            // for (const permit of mappedPermits) {
            //     if (permit.application_number) {
            //         // If application_number exists, upsert based on it
            //         await PermitApplication.findOneAndUpdate(
            //             { application_number: permit.application_number },
            //             { $set: permit },
            //             { upsert: true, new: true }
            //         );
            //     } else {
            //         // If no application_number, insert as new
            //         await PermitApplication.create(permit);
            //     }
            // }

            console.log("Attempting to insert several records")
            return mappedPermits

        }
    }
}

module.exports = populators;

// populators['usa']['north carolina']();