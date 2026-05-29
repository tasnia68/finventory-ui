import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    getCategories,
    getCategoryTree,
    deleteCategory,
} from '../../services/categoryService';
import Button from '../../components/common/Button';
import Alert from '../../components/common/Alert';
import Card from '../../components/common/Card';
import InfoTip from '../../components/common/InfoTip';
import MetricCard from '../../components/common/MetricCard';
import { CatalogHero, CatalogPageFrame } from '../../components/catalog';
import CreateModal from './CreateModal';
import { toList } from './constants';

const CategoriesList = () => {
    const navigate = useNavigate();

    const [tree, setTree] = useState([]);
    const [flatCategories, setFlatCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [alert, setAlert] = useState(null);
    const [showCreate, setShowCreate] = useState(false);
    const [search, setSearch] = useState('');

    const showAlert = (type, message) => {
        setAlert({ type, message });
        window.setTimeout(() => setAlert(null), 5000);
    };

    const fetchCategories = async () => {
        try {
            setLoading(true);
            const [treeData, flatData] = await Promise.all([
                getCategoryTree(),
                getCategories(),
            ]);
            setTree(toList(treeData));
            setFlatCategories(toList(flatData));
        } catch (error) {
            showAlert('error', error.message || 'Failed to load categories');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const handleDelete = async (event, id) => {
        event.stopPropagation();
        if (!window.confirm('Are you sure you want to delete this category?')) return;
        try {
            await deleteCategory(id);
            showAlert('success', 'Category deleted successfully');
            fetchCategories();
        } catch (error) {
            showAlert('error', error.message || 'Failed to delete category');
        }
    };

    const handleEdit = (event, id) => {
        event.stopPropagation();
        navigate(`/categories/${id}`);
    };

    const filteredTree = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return tree;
        const filterNodes = (nodes) =>
            nodes
                .map((node) => {
                    const children = Array.isArray(node.children)
                        ? filterNodes(node.children)
                        : [];
                    const matches = (node.name || '')
                        .toLowerCase()
                        .includes(term);
                    if (matches || children.length > 0) {
                        return { ...node, children };
                    }
                    return null;
                })
                .filter(Boolean);
        return filterNodes(tree);
    }, [tree, search]);

    const renderCategoryTree = (nodes, level = 0) => {
        return nodes.map((category) => (
            <div
                key={category.id}
                className="border-b border-slate-200 last:border-b-0 dark:border-slate-700"
            >
                <div
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/categories/${category.id}`)}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            navigate(`/categories/${category.id}`);
                        }
                    }}
                    className="flex cursor-pointer items-center justify-between p-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50"
                    style={{ paddingLeft: `${level * 2 + 1}rem` }}
                >
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            {level > 0 && (
                                <span className="material-symbols-outlined text-[20px] text-slate-400">
                                    subdirectory_arrow_right
                                </span>
                            )}
                            <h3 className="font-semibold text-slate-900 dark:text-white">
                                {category.name}
                            </h3>
                            {category.publishedToStorefront ? (
                                <span className="rounded-full bg-blue-100 px-2 py-1 text-[11px] font-semibold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                                    Storefront
                                </span>
                            ) : null}
                        </div>
                        {category.description && (
                            <p
                                className="mt-1 text-sm text-slate-500 dark:text-slate-400"
                                style={{ marginLeft: level > 0 ? '28px' : '0' }}
                            >
                                {category.description}
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={(event) => handleEdit(event, category.id)}
                            className="p-2 text-slate-600 transition-colors hover:text-primary dark:text-slate-400 dark:hover:text-primary"
                            title="Edit category"
                        >
                            <span className="material-symbols-outlined text-[20px]">edit</span>
                        </button>
                        <button
                            onClick={(event) => handleDelete(event, category.id)}
                            className="p-2 text-slate-600 transition-colors hover:text-red-600 dark:text-slate-400 dark:hover:text-red-500"
                            title="Delete category"
                        >
                            <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                    </div>
                </div>
                {category.children && category.children.length > 0 && (
                    <div>{renderCategoryTree(category.children, level + 1)}</div>
                )}
            </div>
        ));
    };

    const topLevelCategoryCount = tree.length;
    const nestedCategoryCount = Math.max(flatCategories.length - topLevelCategoryCount, 0);

    return (
        <CatalogPageFrame>
            <CatalogHero
                eyebrow="Phase 3 Catalog"
                title="Keep the catalog hierarchy clean and governed."
                description="Structure templates under clear category trees and define which roles can safely view or edit each branch."
                info="Category permissions help separate catalog ownership between merchandising, operations, and regional teams."
                actions={
                    <Button onClick={() => setShowCreate(true)} icon="add">
                        Add Category
                    </Button>
                }
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <MetricCard
                    title="Total Categories"
                    value={flatCategories.length}
                    caption="Every category currently in the catalog tree"
                    icon="category"
                    tone="blue"
                />
                <MetricCard
                    title="Top-Level Branches"
                    value={topLevelCategoryCount}
                    caption="Primary catalog branches visible to planners"
                    icon="account_tree"
                    tone="emerald"
                />
                <MetricCard
                    title="Nested Categories"
                    value={nestedCategoryCount}
                    caption="Subcategories used for deeper assortment control"
                    icon="subdirectory_arrow_right"
                    tone="amber"
                />
            </div>

            {alert ? (
                <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} />
            ) : null}

            <Card title="Category Tree">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="relative w-full sm:max-w-xs">
                        <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-slate-400">
                            search
                        </span>
                        <input
                            type="search"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Filter categories"
                            className="block w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                        />
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        Click any row to open the category editor.
                    </p>
                </div>
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
                    </div>
                ) : filteredTree.length === 0 ? (
                    <div className="py-12 text-center">
                        <span className="material-symbols-outlined text-[64px] text-slate-300 dark:text-slate-600">
                            category
                        </span>
                        <p className="mt-4 text-slate-500 dark:text-slate-400">
                            {tree.length === 0
                                ? 'No categories yet. Create your first category to get started.'
                                : 'No categories match this filter.'}
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-200 dark:divide-slate-700">
                        {renderCategoryTree(filteredTree)}
                    </div>
                )}
            </Card>

            <Card
                title="Access Policy"
                subtitle="Assign category-level visibility and edit access without leaving the workspace"
            >
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <p className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-300">
                        Define which roles can view or edit specific categories.
                        <InfoTip text="Category permissions are useful when procurement, warehouse, and retail teams should not edit each other's catalog segments." />
                    </p>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                        Open a category to manage its role-level permissions
                    </span>
                </div>
            </Card>

            <CreateModal
                isOpen={showCreate}
                onClose={() => setShowCreate(false)}
                onCreated={(created) => {
                    showAlert('success', 'Category created successfully');
                    fetchCategories();
                    if (created && created.id) {
                        navigate(`/categories/${created.id}`);
                    }
                }}
                flatCategories={flatCategories}
            />
        </CatalogPageFrame>
    );
};

export default CategoriesList;
