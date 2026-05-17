import React, { useState, useEffect } from 'react';
import { PlusIcon, PencilIcon, TrashIcon, TagIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import categoryService from '../services/categoryService';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import LoadingSpinner from '../components/common/LoadingSpinner';

const CategoryForm = ({ category, onSave, onCancel }) => {
  const [form, setForm] = useState({ name: category?.name || '', description: category?.description || '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Category name is required'); return; }
    setLoading(true);
    try {
      await onSave(form);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
        <input value={form.name} onChange={(e) => { setForm({ ...form, name: e.target.value }); setError(''); }}
          className={`input-field ${error ? 'input-error' : ''}`} placeholder="e.g. Science Fiction" />
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={3} className="input-field resize-none" placeholder="Optional description..." />
      </div>
      <div className="flex gap-3">
        <button type="button" onClick={onCancel} className="btn-secondary flex-1">Cancel</button>
        <button type="submit" className="btn-primary flex-1" disabled={loading}>
          {loading ? 'Saving...' : (category ? 'Update' : 'Create')}
        </button>
      </div>
    </form>
  );
};

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editCat, setEditCat] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchCategories = () => {
    setLoading(true);
    categoryService.getAll()
      .then((res) => setCategories(res.data.data.categories))
      .catch(() => toast.error('Failed to load categories'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchCategories(); }, []);

  const handleSave = async (form) => {
    try {
      if (editCat) {
        await categoryService.update(editCat.id, form);
        toast.success('Category updated');
      } else {
        await categoryService.create(form);
        toast.success('Category created');
      }
      setModalOpen(false);
      setEditCat(null);
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
      throw err;
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await categoryService.delete(deleteId);
      toast.success('Category deleted');
      setDeleteId(null);
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Categories</h2>
          <p className="text-sm text-gray-500 mt-0.5">Manage book categories</p>
        </div>
        <button onClick={() => { setEditCat(null); setModalOpen(true); }} className="btn-primary flex items-center gap-2">
          <PlusIcon className="w-4 h-4" /> Add Category
        </button>
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.length === 0 ? (
            <div className="col-span-3 text-center py-16 text-gray-400">
              <TagIcon className="w-10 h-10 mx-auto mb-2 opacity-40" />
              No categories found
            </div>
          ) : categories.map((cat) => (
            <div key={cat.id} className="card flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="p-2 bg-primary-50 rounded-lg flex-shrink-0">
                  <TagIcon className="w-5 h-5 text-primary-600" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{cat.name}</h3>
                  {cat.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{cat.description}</p>}
                  <span className="badge-info badge mt-2">{cat.book_count} books</span>
                </div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => { setEditCat(cat); setModalOpen(true); }}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50">
                  <PencilIcon className="w-4 h-4" />
                </button>
                <button onClick={() => setDeleteId(cat.id)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50">
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); setEditCat(null); }}
        title={editCat ? 'Edit Category' : 'Add Category'} size="sm">
        <CategoryForm category={editCat} onSave={handleSave} onCancel={() => { setModalOpen(false); setEditCat(null); }} />
      </Modal>

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete}
        title="Delete Category" message="Delete this category? Books in this category will be uncategorized."
        loading={deleteLoading} />
    </div>
  );
};

export default Categories;
