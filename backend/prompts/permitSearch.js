export const permitSearch = `
List all permit applications related to farming, animals, agriculture, dairy, and livestock in Washington DC.
Your response must include three separate lists:

permit_applications_submitted
permit_applications_in_draft
permit_applications_approved

Return the results in JSON format.
Each permit application must include the following fields:

permit_number
permit_type
permit_status
permit_date
permit_location
permit_description
permit_documents
permit_documents_url
permit_documents_description
permit_application_link
`