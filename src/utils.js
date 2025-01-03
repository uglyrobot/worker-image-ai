export function validate_image_url(imageUrl) {
  try {
    const url = new URL(imageUrl);
    
    // Reject if no scheme or host
    if (!url.protocol || !url.host) {
      return false;
    }

    // Get the path without query parameters
    const path = url.pathname.split('/').pop();
    if (!path) return false;
    
    return true;
  } catch {
    return false;
  }
} 