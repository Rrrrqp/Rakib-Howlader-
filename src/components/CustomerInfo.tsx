import { useEffect } from 'react';
import { User } from 'lucide-react';
import { DISTRICTS, DISTRICT_UPAZILA_MAP } from '../constants';

interface CustomerInfoProps {
  register: any;
  errors: any;
  watch: any;
  setValue: any;
}

export default function CustomerInfo({ register, errors, watch, setValue }: CustomerInfoProps) {
  const selectedDistrict = watch('district');

  useEffect(() => {
    // Reset upazila whenever district changes
    setValue('upazila', '');
  }, [selectedDistrict, setValue]);

  const upazilas = selectedDistrict ? DISTRICT_UPAZILA_MAP[selectedDistrict] || [] : [];

  return (
    <div className="space-y-12">
      <div className="flex flex-col items-center text-center space-y-2">
         <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-2">
            <User size={24} />
         </div>
         <h2 className="text-2xl font-black text-gray-900 leading-tight">আপনার তথ্য প্রদান করুন</h2>
         <p className="text-sm font-medium text-gray-400">অর্ডারটি সঠিক ভাবে সম্পন্ন করার জন্য নিচের তথ্যগুলো দিন</p>
      </div>

      <div className="space-y-10">
        {/* Name Field */}
        <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow space-y-4">
          <label className="text-base md:text-lg font-bold text-gray-800 flex items-center gap-2">
            আপনার নাম (Full Name) <span className="text-red-500">*</span>
          </label>
          <input 
            {...register('customerName', { required: 'নাম লেখা জরুরি' })}
            placeholder="পুরো নাম এখানে লিখুন"
            className="w-full bg-gray-50 border-b-2 border-gray-100 focus:border-blue-500 focus:bg-white px-3 py-4 text-lg font-medium outline-none transition-all placeholder:text-gray-300 rounded-t-xl"
          />
          {errors.customerName && <p className="text-red-500 text-xs font-bold uppercase tracking-tight">{errors.customerName.message}</p>}
        </div>

        {/* Mobile Number Field */}
        <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow space-y-4">
          <label className="text-base md:text-lg font-bold text-gray-800 flex items-center gap-2">
            মোবাইল নম্বর (Mobile Number) <span className="text-red-500">*</span>
          </label>
          <input 
            type="tel"
            {...register('mobileNumber', { required: 'মোবাইল নম্বর দেওয়া জরুরি' })}
            placeholder="01XXXXXXXXX"
            className="w-full bg-gray-50 border-b-2 border-gray-100 focus:border-blue-500 focus:bg-white px-3 py-4 text-2xl font-black tracking-widest outline-none transition-all placeholder:text-gray-300 rounded-t-xl"
          />
          {errors.mobileNumber && <p className="text-red-500 text-xs font-bold uppercase tracking-tight">{errors.mobileNumber.message}</p>}
        </div>

        {/* District & Upazila */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow space-y-4">
            <label className="text-base font-bold text-gray-800">
              জেলা (District) <span className="text-red-500">*</span>
            </label>
            <select 
              {...register('district', { required: 'জেলা সিলেক্ট করুন' })}
              className="w-full bg-gray-50 border-b-2 border-gray-100 focus:border-blue-500 focus:bg-white px-3 py-4 text-base font-medium outline-none transition-all cursor-pointer rounded-t-xl"
            >
              <option value="">সিলেক্ট করুন</option>
              {DISTRICTS.map(district => (
                <option key={district} value={district}>{district}</option>
              ))}
            </select>
            {errors.district && <p className="text-red-500 text-xs font-bold uppercase tracking-tight">{errors.district.message}</p>}
          </div>

          <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow space-y-4">
            <label className="text-base font-bold text-gray-800">
              উপজেলা (Upazila) <span className="text-red-500">*</span>
            </label>
            <select 
              {...register('upazila', { required: 'উপজেলা সিলেক্ট করুন' })}
              disabled={!selectedDistrict}
              className="w-full bg-gray-50 border-b-2 border-gray-100 focus:border-blue-500 focus:bg-white px-3 py-4 text-base font-medium outline-none transition-all cursor-pointer disabled:opacity-50 rounded-t-xl"
            >
              <option value="">{selectedDistrict ? 'সিলেক্ট করুন' : 'আগে জেলা সিলেক্ট করুন'}</option>
              {upazilas.map(upazila => (
                <option key={upazila} value={upazila}>{upazila}</option>
              ))}
            </select>
            {errors.upazila && <p className="text-red-500 text-xs font-bold uppercase tracking-tight">{errors.upazila.message}</p>}
          </div>
        </div>

        {/* Address Field */}
        <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow space-y-4">
          <label className="text-base md:text-lg font-bold text-gray-800">
            বিস্তারিত ঠিকানা (Shipping Address) <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-gray-400 font-medium -mt-2">বাসা নম্বর, রোড নম্বর, এলাকা ইত্যাদি বিস্তারিত লিখুন</p>
          <textarea 
            {...register('address', { required: 'ঠিকানা লেখা জরুরি' })}
            placeholder="আপনার উত্তর"
            rows={3}
            className="w-full bg-gray-50 border-b-2 border-gray-100 focus:border-blue-500 focus:bg-white px-3 py-4 text-base font-medium outline-none transition-all placeholder:text-gray-300 resize-none rounded-t-xl"
          />
          {errors.address && <p className="text-red-500 text-xs font-bold uppercase tracking-tight">{errors.address.message}</p>}
        </div>
      </div>
    </div>
  );
}
