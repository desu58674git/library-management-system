import React, { useState } from 'react';

const BookForm = ({ book, categories, onSave, onCancel }) => {
  const [form, setForm] = useState({
    title: book?.title || '',
    author: book?.author || '',
    isbn: book?.isbn || '',
    category_id: book?.category_id || '',
    description: book?.description || '',
    publisher: book?.publisher || '',
    publication_year: book?.publication_year || '',
    total_copies: book?.total_copies || 1,
    cover_image_url: book?.cover_image_url || '',
    location: book?.location || '',
    language: book?.language || 'English',
    pages: book?.pages || '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: '' });
  };

  const validate = () => {
    const errs = {};
    if (!form.title.trim()) errs.title = 'Title is required';
    if (!form.author.trim()) errs.author = 'Author is required';
    if (!form.total_copies || form.total_copies < 1) errs.total_copies = 'At least 1 copy required';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setLoading(true);
    try {
      const payload = { ...form };
      if (!payload.category_id) delete payload.category_id;
      if (!payload.isbn) delete payload.isbn;
      if (!payload.publication_year) delete payload.publication_year;
      if (!payload.pages) delete payload.pages;
      payload.total_copies = parseInt(payload.total_copies);
      await onSave(payload);
    } catch (err) {
      if (err.response?.status === 422) {
        const fieldErrors = {};
        err.response.data.errors?.forEach((e) => { fieldErrors[e.field] = e.message; });
        setErrors(fieldErrors);
      }
    } finally {
      setLoading(false);
    }
  };

  const Field = ({ label, name, type = 'text', required, children, colSpan = 1 }) => (
    <div className={colSpan === 2 ? 'col-span-2' : ''}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}{required && ' *'}</label>
      {children || (
        <input name={name} type={type} value={form[name]} onChange={handleChange}
          className={`input-field ${errors[name] ? 'input-error' : ''}`} />
      )}
      {errors[name] && <p className="mt-1 text-xs text-red-600">{errors[name]}</p>}
    </div>
  );

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Title" name="title" required colSpan={2} />
        <Field label="Author" name="author" required colSpan={2} />
        <Field label="ISBN" name="isbn" />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select name="category_id" value={form.category_id} onChange={handleChange} className="input-field">
            <option value="">Select category</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <Field label="Publisher" name="publisher" />
        <Field label="Publication Year" name="publication_year" type="number" />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Total Copies *</label>
          <input name="total_copies" type="number" min="1" value={form.total_copies} onChange={handleChange}
            className={`input-field ${errors.total_copies ? 'input-error' : ''}`} />
          {errors.total_copies && <p className="mt-1 text-xs text-red-600">{errors.total_copies}</p>}
        </div>
        <Field label="Pages" name="pages" type="number" />
        <Field label="Language" name="language" />
        <Field label="Location (Shelf)" name="location" />
        <Field label="Cover Image URL" name="cover_image_url" colSpan={2} />
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea name="description" value={form.description} onChange={handleChange} rows={3}
            className="input-field resize-none" placeholder="Brief description of the book..." />
        </div>
      </div>

      <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
        <button type="button" onClick={onCancel} className="btn-secondary flex-1">Cancel</button>
        <button type="submit" className="btn-primary flex-1" disabled={loading}>
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Saving...
            </span>
          ) : (book ? 'Update Book' : 'Create Book')}
        </button>
      </div>
    </form>
  );
};

export default BookForm;
