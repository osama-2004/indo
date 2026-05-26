const TOKEN = '140edffb-e812-470e-b532-f590e0e0083d';
const PROJECT_ID = 'cecdfd71-1694-4ee3-b946-68de258cf4f3';
const ENV_ID     = 'fcca27a1-3b75-44f9-9abe-e68580b905ae';
const SERVICE_ID = '5ada7be9-db7f-42f4-aa51-88881ac45bfd';

async function main() {
  console.log('Triggering githubRepoUpdate...');
  const mutation = `
    mutation githubRepoUpdate($input: GitHubRepoUpdateInput!) {
      githubRepoUpdate(input: $input)
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
          input: {
            projectId: PROJECT_ID,
            environmentId: ENV_ID,
            serviceId: SERVICE_ID
          }
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
