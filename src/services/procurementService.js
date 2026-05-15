import { request } from './api';

const unwrap = async (promise) => {
    const response = await promise;
    return response.data !== undefined ? response.data : response;
};

export const getProcurementOverview = () => unwrap(request('/procurement/overview'));
