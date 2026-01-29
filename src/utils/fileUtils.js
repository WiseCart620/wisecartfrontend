import { API_BASE_URL } from '../services/api';



export const getFileUrl = (fileUrl) => {
    if (!fileUrl) return getPlaceholderImage();
    if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
        return fileUrl;
    }

    let relativePath = extractRelativePath(fileUrl);

    if (!relativePath) {
        console.error('Could not extract relative path from:', fileUrl);
        return getPlaceholderImage();
    }

    const viewUrl = `${API_BASE_URL}/files/serve?path=${encodeURIComponent(relativePath)}`;

    return viewUrl;
};


export const getFileDownloadUrl = (fileUrl) => {
    if (!fileUrl) return '';

    if (fileUrl.includes('/files/serve')) {
        return fileUrl.replace('/files/serve?', '/files/download?');
    }

    if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
        return fileUrl;
    }

    let relativePath = extractRelativePath(fileUrl);

    if (!relativePath) {
        console.error('Could not extract relative path from:', fileUrl);
        return '';
    }

    const downloadUrl = `${API_BASE_URL}/files/download?path=${encodeURIComponent(relativePath)}`;

    return downloadUrl;
};

const extractRelativePath = (path) => {
    if (!path) return '';
    let cleanPath = path.trim();

    if (cleanPath.includes('://')) {
        const url = new URL(cleanPath);
        cleanPath = url.pathname;
    }

    while (cleanPath.startsWith('/')) {
        cleanPath = cleanPath.substring(1);
    }

    if (cleanPath.startsWith('uploads/')) {
        cleanPath = cleanPath.substring('uploads/'.length);
    }

    cleanPath = cleanPath.replace(/\\/g, '/');

    cleanPath = cleanPath.replace(/\/+/g, '/');
    return cleanPath;
};




export const getFileUrlView = (fileUrl) => {
    if (!fileUrl) return getPlaceholderImage();

    const relativePath = extractRelativePath(fileUrl);
    const parts = relativePath.split('/');

    if (parts.length >= 2) {
        const directory = parts[0];
        const filename = parts.slice(1).join('/');
        return `${API_BASE_URL}/files/view/${directory}/${encodeURIComponent(filename)}`;
    }

    // Fallback to serve endpoint
    return `${API_BASE_URL}/files/serve?path=${encodeURIComponent(relativePath)}`;
};

export const getPlaceholderImage = () => {
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2VlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZSBub3QgZm91bmQ8L3RleHQ+PC9zdmc+';
};

/**
 * Test if file is accessible
 */
export const testFileAccess = async (fileUrl) => {
    const url = getFileUrl(fileUrl);
    try {
        const response = await fetch(url, { method: 'HEAD' });
        return response.ok;
    } catch (error) {
        console.error('File access test failed:', error);
        return false;
    }
};