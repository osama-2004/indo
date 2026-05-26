const TOKEN = '140edffb-e812-470e-b532-f590e0e0083d';
const ENV_ID     = 'fcca27a1-3b75-44f9-9abe-e68580b905ae';
const SERVICE_ID = '5ada7be9-db7f-42f4-aa51-88881ac45bfd';
const COMMIT_SHA = '740a8c54759306df8932321bb4ec44ddc7519497';

async function main() {
  console.log('Triggering serviceInstanceDeployV2...');
  const mutation = `
    mutation serviceInstanceDeployV2($serviceId: String!, $environmentId: String!, $commitSha: String!) {
      serviceInstanceDeployV2(
        serviceId: $serviceId
        environmentId: $environmentId
        commitSha: $commitSha
      )
    }
  `;
  
  try {
    const res = await fetch('https://backboard.railway.app/graphql/v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`
      },
      body: JSON.stringify({
        query: mutation,
        variables: {
          serviceId: SERVICE_ID,
          environmentId: ENV_ID,
          commitSha: COMMIT_SHA
        }
      })
    });
    const data = await res.json();
    console.log('Mutation Response:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error:', err);
  }
}
main();
