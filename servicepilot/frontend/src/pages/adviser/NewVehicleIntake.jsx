import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { createVehicle } from '@/utils/firestoreService';
import toast from 'react-hot-toast';
import { VEHICLE_MODELS, REPAIR_TYPES, REPAIR_CATEGORIES, INSURANCE_COMPANIES } from '@/utils/constants';
import { Car, Save, ArrowLeft } from 'lucide-react';

const initialForm = {
  vehicleNumber: '', vehicleModel: 'Kushaq', repairType: 'ACC REP',
  repairCategory: 'Minor', numberOfPanels: '', documentaryReceivedDate: '',
  surveyApprovedDate: '', promisedDeliveryDate: '', jobCardNumber: '',
  customerName: '', customerMobile: '', insuranceCompany: 'HDFC ERGO', remarks: '',
};

export default function NewVehicleIntake() {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.vehicleNumber) return toast.error('Vehicle number is required');
    if (!form.customerName) return toast.error('Customer name is required');

    setLoading(true);
    try {
      const vehicleData = {
        ...form,
        vehicleNumber: form.vehicleNumber.toUpperCase().replace(/\s/g, ''),
        adviserName: userProfile?.name,
        adviserId: user.uid,
        branch: userProfile?.branch || '',
      };
      const id = await createVehicle(vehicleData, user.uid);
      toast.success('Vehicle intake created successfully!');
      navigate('/adviser/received');
    } catch (err) {
      toast.error(err.message || 'Failed to create intake');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in max-w-3xl mx-auto">
      {/* Header */}
      <div className="section-header mb-8">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="btn-ghost btn-sm p-2">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-white flex items-center gap-2">
              <Car className="w-6 h-6 text-brand-600" /> New Vehicle Intake
            </h1>
            <p className="text-surface-500 text-sm mt-0.5">Register a new vehicle for service</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Vehicle Info */}
        <FormSection title="Vehicle Information">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Vehicle Number *">
              <input name="vehicleNumber" className="input uppercase" placeholder="MH12AB1234" value={form.vehicleNumber} onChange={handleChange} required style={{ textTransform: 'uppercase' }} />
            </Field>
            <Field label="Vehicle Model *">
              <select name="vehicleModel" className="select" value={form.vehicleModel} onChange={handleChange}>
                {VEHICLE_MODELS.map(m => <option key={m}>{m}</option>)}
              </select>
            </Field>
            <Field label="Repair Type *">
              <select name="repairType" className="select" value={form.repairType} onChange={handleChange}>
                {REPAIR_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Repair Category *">
              <select name="repairCategory" className="select" value={form.repairCategory} onChange={handleChange}>
                {REPAIR_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Number of Panels">
              <input name="numberOfPanels" type="number" min="0" className="input" placeholder="0" value={form.numberOfPanels} onChange={handleChange} />
            </Field>
            <Field label="Job Card Number">
              <input name="jobCardNumber" className="input" placeholder="JC-2024-001 (optional at intake)" value={form.jobCardNumber} onChange={handleChange} />
            </Field>
          </div>
        </FormSection>

        {/* Customer Info */}
        <FormSection title="Customer Information">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Customer Name *">
              <input name="customerName" className="input" placeholder="Full name" value={form.customerName} onChange={handleChange} required />
            </Field>
            <Field label="Customer Mobile">
              <input name="customerMobile" className="input" placeholder="9876543210" value={form.customerMobile} onChange={handleChange} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Insurance Company">
                <select name="insuranceCompany" className="select" value={form.insuranceCompany} onChange={handleChange}>
                  {INSURANCE_COMPANIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </Field>
            </div>
          </div>
        </FormSection>

        {/* Dates */}
        <FormSection title="Important Dates">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Documentary Received Date">
              <input name="documentaryReceivedDate" type="date" className="input" value={form.documentaryReceivedDate} onChange={handleChange} />
            </Field>
            <Field label="Survey Approved Date">
              <input name="surveyApprovedDate" type="date" className="input" value={form.surveyApprovedDate} onChange={handleChange} />
            </Field>
            <Field label="Promised Delivery Date">
              <input name="promisedDeliveryDate" type="date" className="input" value={form.promisedDeliveryDate} onChange={handleChange} />
            </Field>
          </div>
        </FormSection>

        {/* Remarks */}
        <FormSection title="Remarks">
          <textarea
            name="remarks"
            className="input min-h-[100px] resize-y"
            placeholder="Any additional notes, damage description, customer requests..."
            value={form.remarks}
            onChange={handleChange}
          />
        </FormSection>

        {/* Submit */}
        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="btn-primary btn-lg">
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Saving...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Save className="w-4 h-4" /> Save Intake
              </span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

function FormSection({ title, children }) {
  return (
    <div className="card p-6">
      <h3 className="font-bold text-surface-900 dark:text-white mb-4 pb-3 border-b border-surface-100 dark:border-surface-700">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}
