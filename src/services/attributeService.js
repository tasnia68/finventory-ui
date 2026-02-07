import { request } from './api';

const unwrap = async (promise) => {
    const response = await promise;
    return response.data !== undefined ? response.data : response;
};

// Attribute Groups
export const getAttributeGroups = () => {
    return unwrap(request('/attribute-groups'));
};

export const getAttributeGroup = (id) => {
    return unwrap(request(`/attribute-groups/${id}`));
};

export const createAttributeGroup = (groupData) => {
    return unwrap(request('/attribute-groups', {
        method: 'POST',
        body: groupData,
    }));
};

export const updateAttributeGroup = (id, groupData) => {
    return unwrap(request(`/attribute-groups/${id}`, {
        method: 'PUT',
        body: groupData,
    }));
};

export const deleteAttributeGroup = (id) => {
    return request(`/attribute-groups/${id}`, {
        method: 'DELETE',
    });
};

// Product Attributes
export const getProductAttributes = (templateId = null) => {
    const url = templateId ? `/product-attributes?templateId=${templateId}` : '/product-attributes';
    return unwrap(request(url));
};

export const getProductAttribute = (id) => {
    return unwrap(request(`/product-attributes/${id}`));
};

export const createProductAttribute = (attributeData) => {
    return unwrap(request('/product-attributes', {
        method: 'POST',
        body: attributeData,
    }));
};

export const updateProductAttribute = (id, attributeData) => {
    return unwrap(request(`/product-attributes/${id}`, {
        method: 'PUT',
        body: attributeData,
    }));
};

export const deleteProductAttribute = (id) => {
    return request(`/product-attributes/${id}`, {
        method: 'DELETE',
    });
};
