import { request } from './api';

const unwrap = async (promise) => {
    const response = await promise;
    return response.data !== undefined ? response.data : response;
};

// Product Templates
export const getProductTemplates = () => {
    return unwrap(request('/product-templates')).then((data) => {
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.content)) return data.content;
        if (data && Array.isArray(data.items)) return data.items;
        return [];
    });
};

export const getProductTemplate = (id) => {
    return unwrap(request(`/product-templates/${id}`));
};

export const createProductTemplate = (templateData) => {
    return unwrap(request('/product-templates', {
        method: 'POST',
        body: templateData,
    }));
};

// Simple Product (Convenience API)
export const createSimpleProduct = (productData) => {
    return unwrap(request('/products/simple', {
        method: 'POST',
        body: productData,
    }));
};

export const updateProductTemplate = (id, templateData) => {
    return unwrap(request(`/product-templates/${id}`, {
        method: 'PUT',
        body: templateData,
    }));
};

export const deleteProductTemplate = (id) => {
    return request(`/product-templates/${id}`, {
        method: 'DELETE',
    });
};

// Product Images
export const getProductImages = (templateId) => {
    return unwrap(request(`/product-templates/${templateId}/images`));
};

export const getProductImageFile = async (imageId) => {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';
    const TENANT_ID = import.meta.env.VITE_TENANT_ID || 'default-tenant';

    const token = localStorage.getItem('accessToken');
    const headers = {
        'X-Tenant-ID': TENANT_ID,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/product-images/${imageId}/file`, {
        method: 'GET',
        headers,
    });

    if (!response.ok) {
        throw new Error('Failed to load product image');
    }

    return response.blob();
};

export const uploadProductImage = async (templateId, file, isMain = false) => {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';
    const TENANT_ID = import.meta.env.VITE_TENANT_ID || 'default-tenant';
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('isMain', isMain);

    const token = localStorage.getItem('accessToken');
    const headers = {
        'X-Tenant-ID': TENANT_ID,
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(
        `${API_BASE_URL}/product-templates/${templateId}/images`,
        {
            method: 'POST',
            headers,
            body: formData,
        }
    );

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to upload image');
    }

    const data = await response.json();
    return data.data !== undefined ? data.data : data;
};

export const deleteProductImage = (templateId, imageId) => {
    return request(`/product-images/${imageId}`, {
        method: 'DELETE',
    });
};

export const setMainImage = (templateId, imageId) => {
    return unwrap(request(`/product-images/${imageId}/main`, {
        method: 'PUT',
    }));
};

// Product Variants
export const getProductVariants = (templateId) => {
    return unwrap(request(`/products?templateId=${templateId}`)).then((data) => {
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.content)) return data.content;
        if (data && Array.isArray(data.items)) return data.items;
        return [];
    });
};

export const searchProductVariants = (query) => {
    if (!query) return Promise.resolve({ content: [] });
    return unwrap(request(`/product-variants?q=${encodeURIComponent(query)}`));
};

export const getProductVariant = (id) => {
    return unwrap(request(`/products/${id}`));
};

export const createProductVariant = (variantData) => {
    return unwrap(request('/products', {
        method: 'POST',
        body: variantData,
    }));
};

export const updateProductVariant = (id, variantData) => {
    return unwrap(request(`/products/${id}`, {
        method: 'PUT',
        body: variantData,
    }));
};

export const deleteProductVariant = (id) => {
    return request(`/products/${id}`, {
        method: 'DELETE',
    });
};
