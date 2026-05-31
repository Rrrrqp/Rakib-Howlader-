import React from 'react';
import { motion } from 'motion/react';
import { Star, Quote, Heart, Phone } from 'lucide-react';

const reviews = [
  {
    id: 1,
    name: 'তানজিলা আক্তার',
    location: 'উত্তরা, ঢাকা',
    rating: 5,
    text: 'সেরা ফ্যাশন হাউজ এর ড্রেসগুলো সত্যি অনন্য। কাপড়ের মান এবং ডিজাইন আমাকে মুগ্ধ করেছে। তাদের ডেলিভারি সার্ভিসও খুব দ্রুত।',
    avatar: 'https://images.unsplash.com/photo-1614283233556-f35b0c801efd?w=200&h=200&fit=crop',
    role: 'Verified Buyer',
  },
  {
    id: 2,
    name: 'ফারহানা ইয়াসমিন',
    location: 'বনানী, ঢাকা',
    rating: 5,
    text: 'প্রিমিয়াম কোয়ালিটির জন্য সেরা ফ্যাশন হাউজ এখন আমার প্রথম পছন্দ। গত মাসে দুটি থ্রিপিস অর্ডার করেছিলাম, একদম ছবির মতোই পেয়েছি।',
    avatar: 'https://images.unsplash.com/photo-1589156280159-27698a70f29e?w=200&h=200&fit=crop',
    role: 'Premium Member',
  },
  {
    id: 3,
    name: 'নুসরাত জাহান',
    location: 'চট্টগ্রাম',
    rating: 5,
    text: 'খুবই সুন্দর ডিজাইন। সচরাচর এমন ইউনিক কালেকশন অন্য কোথাও দেখা যায় না। ধন্যবাদ সেরা ফ্যাশন হাউজকে।',
    avatar: 'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=200&h=200&fit=crop',
    role: 'Verified Buyer',
  },
  {
    id: 4,
    name: 'মাইশা কবির',
    location: 'ধানমন্ডি, ঢাকা',
    rating: 5,
    text: 'কালার কম্বিনেশন এবং স্টিচিং কোয়ালিটি দারুন। যারা রুচিশীল পোশাক খুঁজছেন তাদের জন্য এটিই সেরা জায়গা।',
    avatar: 'https://images.unsplash.com/photo-1635488662761-fa02636ca560?w=200&h=200&fit=crop',
    role: 'Fashion Enthusiast',
  },
  {
    id: 5,
    name: 'রাবেয়া সুলতানা',
    location: 'সিলেট',
    rating: 5,
    text: 'অর্ডার করার ২ দিনের মধ্যেই হাতে পেয়েছি। ফিনিশিং এবং প্যাকিং দেখেই বোঝা যায় তারা কাস্টমার সার্ভিসের ব্যাপারে কতটা সিরিয়াস।',
    avatar: 'https://images.unsplash.com/photo-1621012430307-b4774b78d3cb?w=200&h=200&fit=crop',
    role: 'Regular Customer',
  }
];

export default function ReviewSection() {
  // Duplicate the reviews array for seamless infinite scroll
  const doubledReviews = [...reviews, ...reviews];

  return (
    <section className="py-12 bg-brand-cream/50 overflow-hidden">
      <div className="max-w-4xl mx-auto px-4 mb-8">
        <div className="text-center space-y-2">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="flex justify-center gap-1 text-brand-gold"
          >
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={16} fill="currentColor" />
            ))}
          </motion.div>
          <h2 className="text-lg font-serif font-black text-gray-900 tracking-tight">
            কাস্টমারদের ভালোবাসা ও <span className="text-brand-gold italic">রিভিউ</span>
          </h2>
          <p className="text-[8px] font-medium text-gray-500 uppercase tracking-[0.2em] font-serif">
            Trusted by 5,000+ Happy Customers
          </p>
        </div>
      </div>

      <div className="relative flex">
        <motion.div 
          className="flex gap-3 px-4"
          animate={{
            x: [0, -1350], // Adjusted for smaller cards (w-240 + gap-12 approx)
          }}
          transition={{
            duration: 45, // Slightly slower for better readability
            repeat: Infinity,
            ease: "linear",
          }}
        >
          {doubledReviews.map((review, idx) => (
            <div 
              key={`${review.id}-${idx}`}
              className="flex-shrink-0 w-[200px] bg-white rounded-lg p-4 shadow-sm border border-brand-gold/5 relative group hover:border-brand-gold/20 transition-all"
            >
              <div className="absolute top-3 right-4 text-brand-gold/5 group-hover:text-brand-gold/10 transition-colors">
                <Quote size={20} />
              </div>
              
              <div className="flex items-center gap-2 mb-2.5">
                <div className="w-8 h-8 rounded-full overflow-hidden border border-brand-gold/10 p-0.5">
                  <img src={review.avatar} alt={review.name} className="w-full h-full object-cover rounded-full filter grayscale group-hover:grayscale-0 transition-all" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-gray-900 text-[11px] leading-tight truncate">{review.name}</h4>
                  <p className="text-[8px] text-gray-400 font-medium truncate">{review.location}</p>
                </div>
              </div>

              <p className="text-gray-600 leading-relaxed text-[10px] font-medium italic mb-3 line-clamp-2">
                "{review.text}"
              </p>

              <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                <div className="flex items-center gap-1">
                  <Heart size={6} className="text-brand-gold fill-brand-gold" />
                  <span className="text-[6px] font-black uppercase tracking-wider text-brand-gold">{review.role}</span>
                </div>
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={6} className="text-brand-gold fill-brand-gold" />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
