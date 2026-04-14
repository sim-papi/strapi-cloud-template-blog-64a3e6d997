export async function fetchFromStrapi(endpoint: string) {
  // Call our own backend proxy to avoid CORS issues
  // The proxy is at /api/*
  
  // If the endpoint starts with api/, remove it because the proxy adds it
  const cleanEndpoint = endpoint.replace(/^api\//, '').replace(/^\//, '');

  try {
    const url = `/api/${cleanEndpoint}`;
    console.log(`[CLIENT] Fetching from proxy: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const contentType = response.headers.get("content-type");
    let data;
    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
      console.log(`[CLIENT] Proxy response (JSON):`, data);
    } else {
      const text = await response.text();
      console.log(`[CLIENT] Proxy response (Text):`, text.substring(0, 200));
      data = { error: { message: text.substring(0, 200) } };
    }

    if (!response.ok) {
      throw new Error(data.error?.message || `Proxy request failed: ${response.statusText} (${response.status})`);
    }

    return data;
  } catch (error: any) {
    throw error;
  }
}

export async function getMachines() {
  const response = await fetchFromStrapi('api/machines');
  return response.data || [];
}

export async function getErrors() {
  // Use explicit populate for machines and causes. 
  // Strapi 5 sometimes has issues with populate=* if there are complex relations.
  const response = await fetchFromStrapi('api/errors?populate=machines&populate=causes');
  return response.data || [];
}

export async function updateError(id: string | number, data: any) {
  const cleanEndpoint = `api/errors/${id}`;
  
  try {
    const url = `/api/${cleanEndpoint.replace(/^api\//, '')}`;
    console.log(`[CLIENT] Updating Strapi record: ${url}`);
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data }),
    });

    const contentType = response.headers.get("content-type");
    let result;
    if (contentType && contentType.includes("application/json")) {
      result = await response.json();
    } else {
      const text = await response.text();
      result = { error: { message: text.substring(0, 200) } };
    }

    if (!response.ok) {
      throw new Error(result.error?.message || `Update failed: ${response.statusText} (${response.status})`);
    }

    return result.data;
  } catch (error: any) {
    throw error;
  }
}
