const LIVE_URL = 'https://web-production-79c49.up.railway.app';

async function main() {
  const origin = 'https://web-production-79c49.up.railway.app';
  console.log(`Sending request to ${LIVE_URL}/api/health with Origin: ${origin}`);
  
  const res = await fetch(`${LIVE_URL}/api/health`, {
    headers: {
      'Origin': origin
    }
  });
  
  console.log('Status:', res.status);
  console.log('Headers:');
  res.headers.forEach((v, k) => {
    console.log(`  ${k}: ${v}`);
  });
  console.log('Body:', await res.text());
}
main();
