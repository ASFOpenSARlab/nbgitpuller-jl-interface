export async function makeNbgitpullerRequest(
  githubUrl: string,
  destination: string,
  githubBranch: string = 'main'
) {
  const url = window.location.origin + '/nbgitpuller-jl-interface/gitpuller';
  const xsrfToken = document.cookie
    .split(';')
    .find(row => row.startsWith('_xsrf='))
    ?.split('=')[1];
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-XSRFToken': xsrfToken ?? ''
    },
    body: JSON.stringify({
      githubUrl: githubUrl,
      githubBranch: githubBranch,
      destination: destination
    })
  });
  const data = await response.json();
  return data;
}
