export const emptyCategoryForm = () => ({
    name: '',
    description: '',
    parentId: null,
    publishedToStorefront: true,
    storefrontSlug: '',
    storefrontTitle: '',
    storefrontDescription: '',
    storefrontSortOrder: '',
});

export const categoryToFormState = (category) => ({
    name: category?.name || '',
    description: category?.description || '',
    parentId: category?.parentId || null,
    publishedToStorefront: category?.publishedToStorefront ?? false,
    storefrontSlug: category?.storefrontSlug || '',
    storefrontTitle: category?.storefrontTitle || '',
    storefrontDescription: category?.storefrontDescription || '',
    storefrontSortOrder: category?.storefrontSortOrder ?? '',
});

export const buildCategoryPayload = (form) => ({
    ...form,
    storefrontSortOrder:
        form.storefrontSortOrder === '' || form.storefrontSortOrder === null
            ? null
            : Number(form.storefrontSortOrder),
});

export const toList = (value) => (Array.isArray(value) ? value : []);

export const countTreeDescendants = (tree) => {
    let total = 0;
    const walk = (nodes) => {
        nodes.forEach((node) => {
            total += 1;
            if (Array.isArray(node.children) && node.children.length > 0) {
                walk(node.children);
            }
        });
    };
    walk(tree);
    return total;
};

export const findCategoryInTree = (tree, id) => {
    if (!id) return null;
    const targetId = String(id);
    const stack = [...tree];
    while (stack.length) {
        const node = stack.shift();
        if (String(node.id) === targetId) return node;
        if (Array.isArray(node.children) && node.children.length > 0) {
            stack.push(...node.children);
        }
    }
    return null;
};
