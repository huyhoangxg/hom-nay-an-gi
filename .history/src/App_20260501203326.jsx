import React, { useState, useEffect, useRef } from 'react';
import { FOOD_DATABASE } from './data/foodData';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gwdoaxroigzbjzfhztzb.supabase.co'; 
const SUPABASE_ANON_KEY = 'sb_publishable_DXeakM5wj6SLyhAz6qi3oQ_aqpvINcP';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const SLIDER_IMAGES = [
  "https://vietfood.org.vn/wp-content/uploads/2020/12/Pho1.jpg",
  "https://trixie.com.vn/media/images/product/43895267/c%C6%A1m%20chi%C3%AAn%20d%C6%B0%C6%A1ng%20ch%C3%A2u.jpg",
  "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1000&q=80",
  "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1000&q=80",
  "https://images.unsplash.com/photo-1617093727343-374698b1b08d?auto=format&fit=crop&w=1000&q=80",
  "https://cdn.zsoft.solutions/poseidon-web/app/media/Kham-pha-am-thuc/11.2023/241123-banh-cuon-buffet-poseidon-3.jpg"
];

function App() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [randomFood, setRandomFood] = useState("");
  const [isSpinning, setIsSpinning] = useState(false);
  
  // States cho Form
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); // Trạng thái đang tải ảnh lên
  const [formData, setFormData] = useState({ name: '', email: '', rating: 5, feedback: '' });
  
  // States cho Ảnh Upload
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // States lấy dữ liệu
  const [isLoadingTestimonials, setIsLoadingTestimonials] = useState(true);
  const [testimonials, setTestimonials] = useState([]);

  // States Bộ lọc
  const [filters, setFilters] = useState({ price: '', time: '', people: '', style: '' });
  const [hasSearched, setHasSearched] = useState(false);
  const [searchResults, setSearchResults] = useState([]);

  const scrollRef = useRef(null);

  useEffect(() => {
    fetchTestimonials();
    const slideInterval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDER_IMAGES.length);
    }, 3500);
    return () => clearInterval(slideInterval);
  }, []);

  const fetchTestimonials = async () => {
    try {
      setIsLoadingTestimonials(true);
      const { data, error } = await supabase
        .from('testimonials')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      if (data) setTestimonials(data);
    } catch (error) {
      console.error('Lỗi khi lấy dữ liệu:', error.message);
    } finally {
      setIsLoadingTestimonials(false);
    }
  };

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleRandomize = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    let count = 0;
    const spinInterval = setInterval(() => {
      const randomItem = FOOD_DATABASE[Math.floor(Math.random() * FOOD_DATABASE.length)];
      setRandomFood(randomItem.name);
      count++;
      if (count > 15) {
        clearInterval(spinInterval);
        setIsSpinning(false);
        const finalItem = FOOD_DATABASE[Math.floor(Math.random() * FOOD_DATABASE.length)];
        setRandomFood(`${finalItem.name} 🤤`);
      }
    }, 100);
  };

  const handleSearch = () => {
    const results = FOOD_DATABASE.filter(food => {
      return (
        (filters.price === '' || food.price === filters.price) &&
        (filters.time === '' || food.time === filters.time) &&
        (filters.people === '' || food.people === filters.people) &&
        (filters.style === '' || food.style === filters.style)
      );
    });
    setSearchResults(results);
    setHasSearched(true);
  };

  // Hàm xử lý khi người dùng chọn ảnh từ máy tính
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      // Tạo một URL tạm thời để hiển thị preview ngay trên web
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // HÀM GỬI ĐÁNH GIÁ (Đã bao gồm upload ảnh)
  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true); // Bật trạng thái loading
    
    let uploadedImageUrl = null;

    try {
      // 1. NẾU CÓ ẢNH: Tải ảnh lên Storage trước
      if (imageFile) {
        // Tạo tên file độc nhất để không bị trùng (dùng thời gian hiện tại)
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

        // Upload vào bucket 'testimonial_images'
        const { error: uploadError } = await supabase.storage
          .from('testimonial_images')
          .upload(fileName, imageFile);

        if (uploadError) throw uploadError;

        // Lấy public URL của ảnh vừa up
        const { data: { publicUrl } } = supabase.storage
          .from('testimonial_images')
          .getPublicUrl(fileName);
          
        uploadedImageUrl = publicUrl;
      }

      // 2. TẠO DATA & LƯU VÀO DATABASE
      const newTestimonial = {
        name: formData.name,
        subtitle: formData.email,
        rating: formData.rating,
        content: formData.feedback,
        avatarColor: "bg-[#f96b15]", 
        avatarText: formData.name.charAt(0).toUpperCase(),
        image_url: uploadedImageUrl // Lưu link ảnh (nếu có)
      };

      const { data, error } = await supabase
        .from('testimonials')
        .insert([newTestimonial])
        .select();

      if (error) throw error;

      // 3. THÀNH CÔNG: Xóa form và cập nhật UI
      if (data) {
        setTestimonials([data[0], ...testimonials]);
        setIsSubmitted(true);
        setFormData({ name: '', email: '', rating: 5, feedback: '' });
        setImageFile(null);
        setImagePreview(null);
      }

    } catch (error) {
      console.error('Lỗi gửi phản hồi:', error.message);
      alert('Lỗi: ' + error.message);
    } finally {
      setIsSubmitting(false); // Tắt trạng thái loading
    }
  };

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -350, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 350, behavior: 'smooth' });
    }
  };

  const RenderStars = ({ rating, interactive = false }) => {
    return (
      <div className="flex text-[#eab308] gap-1 mb-4">
        {[1, 2, 3, 4, 5].map(star => (
          <svg
            key={star}
            onClick={() => interactive && !isSubmitting && setFormData({ ...formData, rating: star })}
            className={`${interactive && !isSubmitting ? 'w-8 h-8 cursor-pointer hover:scale-110 transition-transform' : 'w-5 h-5'} ${star <= rating ? 'fill-current text-[#eab308]' : 'fill-none stroke-[#eab308] stroke-2'}`}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
          </svg>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-bgLight selection:bg-brand selection:text-white">
      
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md shadow-sm border-b border-gray-100 transition-all">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div onClick={() => scrollToSection('hero')} className="cursor-pointer flex items-center gap-2 text-brand font-bold text-xl md:text-2xl tracking-tight hover:scale-105 transition-transform">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand">
              <path d="M4 14a8 8 0 0 0 16 0H4Z"></path>
              <path d="M9 22h6"></path>
              <path d="M10 3.5a2 2 0 0 1 4 0c0 1.5-2 2.5-2 2.5"></path>
              <path d="M12 8.5v.01"></path>
              <path d="M5 6.5a1.5 1.5 0 0 1 3 0c0 1-1.5 1.5-1.5 2"></path>
              <path d="M6.5 11v.01"></path>
              <path d="M16 6.5a1.5 1.5 0 0 1 3 0c0 1-1.5 1.5-1.5 2"></path>
              <path d="M17.5 11v.01"></path>
            </svg>
            Hôm Nay Ăn Gì
          </div>
          <nav className="hidden md:flex gap-8 text-sm text-textGray font-medium">
            <button onClick={() => scrollToSection('features')} className="hover:text-brand transition outline-none">Tính năng</button>
            <button onClick={() => scrollToSection('filter-section')} className="hover:text-brand transition outline-none">Lọc món</button>
            <button onClick={() => scrollToSection('testimonials')} className="hover:text-brand transition outline-none">Đánh giá</button>
            <button onClick={() => scrollToSection('feedback-form')} className="hover:text-brand transition outline-none">Góp ý</button>
            <button onClick={() => scrollToSection('team')} className="hover:text-brand transition outline-none">Đội ngũ</button>
          </nav>
        </div>
      </header>

      <main id="hero" className="container mx-auto px-6 py-10 md:py-20 flex flex-col md:flex-row items-center gap-12 lg:gap-20">
        <div className="w-full md:w-1/2 flex flex-col items-start gap-6">
          <h1 className="text-4xl md:text-5xl lg:text-[48px] font-extrabold leading-[1.1] tracking-tight text-[#111827]">
            Ăn gì khó? 
          </h1>
          <h1 className="text-3xl md:text-4xl lg:text-[64px] font-extrabold leading-[1.1] tracking-tight text-[#111827]">
            Để tụi này lo! 
          </h1>
          <p className="text-textGray text-base md:text-lg leading-relaxed lg:pr-12">
            Giải quyết câu hỏi "hôm nay ăn gì?" hàng ngày. Nhanh chóng, vui vẻ và cá nhân hóa cho sinh viên, dân văn phòng và người ăn một mình.
          </p>
          <button onClick={() => scrollToSection('features')} className="mt-4 bg-brand hover:bg-[#f96b15] text-white font-semibold py-3.5 px-8 rounded-full shadow-lg shadow-orange-500/30 transition transform hover:-translate-y-1">
            Khám phá ngay
          </button>
        </div>
        
        <div className="w-full md:w-1/2 relative">
          
          <div className="relative h-[450px] md:h-[600px] rounded-[32px] overflow-hidden shadow-2xl">
            {SLIDER_IMAGES.map((img, index) => (
              <img key={index} src={img} alt="Món ăn" className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${index === currentSlide ? 'opacity-100' : 'opacity-0'}`} />
            ))}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
          </div>

          <button 
            onClick={handleRandomize} 
            className={`absolute bottom-4 right-4 md:bottom-4 md:right-4 z-20 ${randomFood ? 'bg-white text-brand' : 'bg-yellow-400 text-yellow-900'} font-extrabold px-8 py-5 md:px-10 md:py-6 rounded-full flex items-center gap-3 md:gap-4 shadow-[0_20px_50px_rgba(0,0,0,0.4)] hover:scale-110 transition-all outline-none border-4 border-white/50`}
          >
            <span className={`text-4xl md:text-5xl ${isSpinning ? 'animate-spin' : ''}`}>🎲</span>
            <span className="text-xl md:text-3xl">{randomFood || "Ngẫu nhiên thông minh!"}</span>
          </button>
          
        </div>
      </main>

      <section id="features" className="bg-white py-20 scroll-mt-20">
        {/* ... (Đoạn Tính Năng Nổi Bật giữ nguyên) ... */}
        <div className="container mx-auto px-6">
          <div className="text-center mb-16"><h2 className="text-3xl md:text-4xl font-extrabold text-textDark mb-4">Tính năng nổi bật</h2><p className="text-textGray text-lg">Ba tính năng giúp bạn chọn món ăn dễ dàng hơn bao giờ hết</p></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-[#fff7ed] rounded-[32px] p-8 flex flex-col h-full hover:-translate-y-2 transition duration-300"><div className="bg-[#f97316] w-14 h-14 rounded-full flex items-center justify-center mb-6 shadow-md"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg></div><h3 className="text-xl font-bold mb-3 text-gray-900">Gợi ý 1 chạm</h3><p className="text-gray-600 mb-8 text-sm leading-relaxed flex-grow">Nhận gợi ý món ăn độc đáo ngay lập tức. Không thích? Quay lại và thử lại!</p><div className="bg-white p-2 rounded-2xl shadow-sm mt-auto"><img src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80" className="rounded-xl w-full h-40 object-cover" alt="Feature 1" /></div></div>
            <div className="bg-[#fefce8] rounded-[32px] p-8 flex flex-col h-full hover:-translate-y-2 transition duration-300"><div className="bg-[#eab308] w-14 h-14 rounded-full flex items-center justify-center mb-6 shadow-md"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg></div><h3 className="text-xl font-bold mb-3 text-gray-900">Bộ lọc thông minh</h3><p className="text-gray-600 mb-6 text-sm leading-relaxed">Tùy chỉnh theo Giá, Thời gian, Số người, và Phong cách.</p><div className="space-y-3 mt-auto"><div className="flex items-center gap-3 text-sm font-medium text-gray-700 bg-white px-4 py-3 rounded-xl shadow-sm border border-yellow-100"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>Thời gian: Nhanh</div><div className="flex items-center gap-3 text-sm font-medium text-gray-700 bg-white px-4 py-3 rounded-xl shadow-sm border border-yellow-100"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>Số người: Một mình</div></div></div>
            <div className="bg-[#f0fdf4] rounded-[32px] p-8 flex flex-col h-full hover:-translate-y-2 transition duration-300"><div className="bg-[#22c55e] w-14 h-14 rounded-full flex items-center justify-center mb-6 shadow-md"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/></svg></div><h3 className="text-xl font-bold mb-3 text-gray-900">Lịch sử thông minh</h3><p className="text-gray-600 mb-8 text-sm leading-relaxed flex-grow">Ghi nhớ những gì bạn đã ăn hôm nay để tránh gợi ý trùng lặp. Luôn có món mới mẻ!</p><div className="bg-white p-2 rounded-2xl shadow-sm mt-auto"><img src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=500&q=80" className="rounded-xl w-full h-40 object-cover" alt="Feature 3" /></div></div>
          </div>
        </div>
      </section>

      <section id="filter-section" className="bg-[#fdfaf5] py-20 scroll-mt-20 border-t border-b border-orange-100">
        <div className="container mx-auto px-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-extrabold text-textDark mb-4">Tìm món theo sở thích</h2>
            <p className="text-textGray text-lg">Hệ thống sẽ tự động lọc ra các món ăn phù hợp với lựa chọn của bạn</p>
          </div>

          <div className="bg-white p-6 md:p-8 rounded-[32px] shadow-xl shadow-orange-100 mb-10 max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">💰 Mức giá</label>
                <select className="w-full bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl outline-none" value={filters.price} onChange={(e) => setFilters({...filters, price: e.target.value})}><option value="">Tất cả</option><option value="rẻ">Rẻ</option><option value="bình thường">Bình thường</option></select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">⏱ Thời gian</label>
                <select className="w-full bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl outline-none" value={filters.time} onChange={(e) => setFilters({...filters, time: e.target.value})}><option value="">Tất cả</option><option value="nhanh">Nhanh</option><option value="ngồi lâu">Ngồi lâu</option></select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">👥 Số người</label>
                <select className="w-full bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl outline-none" value={filters.people} onChange={(e) => setFilters({...filters, people: e.target.value})}><option value="">Bất kể</option><option value="1 mình">Một mình</option><option value="cùng bạn">Cùng bạn</option></select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">🥗 Phong cách</label>
                <select className="w-full bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl outline-none" value={filters.style} onChange={(e) => setFilters({...filters, style: e.target.value})}><option value="">Tất cả</option><option value="no">Ăn no</option><option value="nhẹ">Ăn nhẹ</option><option value="healthy">Healthy</option><option value="ăn vặt">Ăn vặt</option></select>
              </div>
            </div>
            <div className="mt-8 flex justify-center">
              <button onClick={handleSearch} className="bg-brand hover:bg-[#e05e10] text-white font-bold py-3.5 px-10 rounded-xl transition shadow-lg shadow-orange-500/30 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                Tìm món ngay
              </button>
            </div>
          </div>

          {hasSearched && (
            <div className="max-w-5xl mx-auto transition-all duration-500">
              <h3 className="font-bold text-gray-800 text-xl mb-6">Kết quả: {searchResults.length} món</h3>
              {searchResults.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                  {searchResults.map(food => (
                    <div key={food.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition duration-300 flex flex-col h-full">
                      <h4 className="font-extrabold text-lg text-textDark mb-3">{food.name}</h4>
                      <div className="flex flex-wrap gap-2 mt-auto">
                        <span className="bg-orange-50 text-orange-600 border border-orange-100 text-[11px] font-semibold px-2 py-1 rounded-md">{food.price}</span>
                        <span className="bg-blue-50 text-blue-600 border border-blue-100 text-[11px] font-semibold px-2 py-1 rounded-md">{food.style}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-3xl p-10 text-center shadow-sm">
                  <h4 className="font-bold text-xl text-gray-800 mb-2">Chưa có món nào khớp 100%</h4>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <section id="testimonials" className="bg-white py-20 scroll-mt-10 overflow-hidden">
        <div className="container mx-auto px-6 relative">
          
          <div className="text-center mb-12 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-left">
              <h2 className="text-3xl md:text-4xl font-extrabold text-textDark mb-2">Người dùng nói gì về chúng tôi</h2>
              <p className="text-textGray text-lg">Đánh giá thực tế từ cộng đồng "Hôm nay ăn gì?"</p>
            </div>
            
            <div className="hidden md:flex gap-3">
              <button onClick={scrollLeft} className="bg-white border border-gray-200 text-brand p-3 rounded-full hover:bg-brand hover:text-white hover:border-brand shadow-sm transition-all outline-none">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              </button>
              <button onClick={scrollRight} className="bg-white border border-gray-200 text-brand p-3 rounded-full hover:bg-brand hover:text-white hover:border-brand shadow-sm transition-all outline-none">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
              </button>
            </div>
          </div>
          
          {isLoadingTestimonials ? (
            <div className="text-center text-gray-500 py-10">Đang tải đánh giá từ hệ thống...</div>
          ) : (
            <div ref={scrollRef} className="flex overflow-x-auto gap-6 pb-8 pt-4 snap-x snap-mandatory scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {testimonials.length === 0 ? (
                <div className="text-center text-gray-500 w-full py-10">Chưa có đánh giá nào. Hãy là người đầu tiên!</div>
              ) : (
                testimonials.map((item) => (
                  <div 
                    key={item.id} 
                    className="min-w-[320px] md:min-w-[400px] snap-center shrink-0 bg-bgLight rounded-[32px] p-8 shadow-sm hover:shadow-md transition-shadow flex flex-col border border-gray-100 animate-fade-in"
                  >
                    <div className="flex items-center gap-4 mb-6">
                      <div className={`w-14 h-14 rounded-full ${item.avatarColor || 'bg-brand'} flex items-center justify-center text-white font-bold text-xl shadow-inner`}>
                        {item.avatarText}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <h4 className="font-bold text-textDark text-lg truncate">{item.name}</h4>
                        <p className="text-textGray text-sm truncate">{item.subtitle}</p>
                      </div>
                    </div>
                    <RenderStars rating={item.rating} />
                    <p className="text-textGray leading-relaxed flex-grow italic">"{item.content}"</p>
                    
                    {/* HIỂN THỊ ẢNH NẾU ĐÁNH GIÁ ĐÓ CÓ ẢNH */}
                    {item.image_url && (
                      <div className="mt-6 rounded-2xl overflow-hidden border border-gray-200">
                        <img src={item.image_url} alt="Review attachment" className="w-full h-48 object-cover hover:scale-105 transition-transform duration-500" />
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
          
          <div className="text-center mt-2 text-gray-400 text-sm md:hidden flex items-center justify-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 12h-4l-3-3M3 12h4l3 3M21 12H3"/></svg>
            Vuốt ngang để xem thêm
          </div>
        </div>
      </section>

      <section id="feedback-form" className="bg-brand py-20 scroll-mt-20">
        <div className="container mx-auto px-6 flex justify-center">
          <div className="bg-white rounded-[32px] p-8 md:p-12 w-full max-w-2xl shadow-2xl relative overflow-hidden">
            {isSubmitted ? (
              <div className="text-center py-10 animate-fade-in">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-3xl font-extrabold text-textDark mb-4">Cảm ơn đánh giá của bạn!</h2>
                <p className="text-textGray text-lg mb-8">Feedback của bạn đã được thêm thành công vào hệ thống. Hãy kéo lên phần đánh giá để xem nhé!</p>
                <button onClick={() => setIsSubmitted(false)} className="text-brand font-semibold hover:underline">
                  Gửi thêm đánh giá khác
                </button>
              </div>
            ) : (
              <>
                <div className="text-center mb-10">
                  <h2 className="text-3xl font-extrabold text-textDark mb-3">Gửi Đánh Giá & Góp Ý</h2>
                  <p className="text-textGray">Đánh giá của bạn sẽ giúp cộng đồng có thêm niềm tin sử dụng sản phẩm!</p>
                </div>

                <form onSubmit={handleFeedbackSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-textDark mb-2">Tên hiển thị <span className="text-red-500">*</span></label>
                      <input type="text" required disabled={isSubmitting} value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Vd: Nguyễn Văn A" className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-brand outline-none disabled:bg-gray-100" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-textDark mb-2">Email <span className="text-red-500">*</span></label>
                      <input type="email" required disabled={isSubmitting} value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="Vd: email@gmail.com" className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-brand outline-none disabled:bg-gray-100" />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-textDark mb-2">Chấm điểm ứng dụng</label>
                    <RenderStars rating={formData.rating} interactive={true} />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-textDark mb-2">Lời đánh giá của bạn <span className="text-red-500">*</span></label>
                    <textarea required disabled={isSubmitting} rows="4" value={formData.feedback} onChange={(e) => setFormData({...formData, feedback: e.target.value})} placeholder="Bạn thích nhất tính năng nào của ứng dụng này?" className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-brand outline-none resize-none disabled:bg-gray-100"></textarea>
                  </div>

                  {/* KHU VỰC UPLOAD ẢNH MỚI */}
                  <div>
                    <label className="block text-sm font-medium text-textDark mb-2">Đính kèm ảnh thực tế món ăn (Không bắt buộc)</label>
                    <input 
                      type="file" 
                      accept="image/*" 
                      disabled={isSubmitting}
                      onChange={handleImageChange}
                      className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-brand hover:file:bg-orange-100 cursor-pointer outline-none"
                    />
                    {/* Hiển thị ảnh xem trước nếu người dùng đã chọn ảnh */}
                    {imagePreview && (
                      <div className="mt-4 relative inline-block">
                        <img src={imagePreview} alt="Preview" className="h-32 object-cover rounded-xl border border-gray-200 shadow-sm" />
                        <button type="button" onClick={() => {setImageFile(null); setImagePreview(null);}} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow hover:bg-red-600 transition">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {/* Nút submit có hiệu ứng Loading */}
                  <button type="submit" disabled={isSubmitting} className="w-full mt-4 bg-brand hover:bg-[#e05e10] text-white font-bold py-4 rounded-xl transition shadow-lg shadow-orange-500/30 flex justify-center items-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:shadow-none">
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        Đang tải dữ liệu lên...
                      </>
                    ) : (
                      "Gửi đánh giá"
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Team Intro Section */}
      <section id="team" className="bg-white py-24 scroll-mt-20 border-b border-gray-100">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-textDark mb-4">Đội ngũ của chúng tôi</h2>
            <p className="text-textGray text-lg max-w-2xl mx-auto">
              Những người trẻ đam mê công nghệ đứng sau dự án "Hôm nay ăn gì?", với mong muốn mang lại bữa ăn vui vẻ và tiện lợi cho tất cả mọi người.
            </p>
          </div>  
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10 text-center">
            <div className="group"><div className="w-32 h-32 mx-auto rounded-full overflow-hidden mb-6 shadow-xl shadow-brand/20 border-4 border-white group-hover:-translate-y-2 transition duration-300"><img src="src/assets/DoKimGiang.jpg" alt="Thành viên" className="w-full h-full object-cover" /></div><h4 className="text-xl font-bold mb-1">Đỗ Kim Giang</h4><p className="text-brand text-sm">Project Manager</p></div>
            <div className="group"><div className="w-32 h-32 mx-auto rounded-full overflow-hidden mb-6 shadow-xl shadow-brand/20 border-4 border-white group-hover:-translate-y-2 transition duration-300"><img src="src/assets/LeThiHuongGiang.jpg" alt="Thành viên" className="w-full h-full object-cover" /></div><h4 className="text-xl font-bold mb-1">Lê Thị Hương Giang</h4><p className="text-brand text-sm">Designer</p></div>
            <div className="group"><div className="w-32 h-32 mx-auto rounded-full overflow-hidden mb-6 shadow-xl shadow-brand/20 border-4 border-white group-hover:-translate-y-2 transition duration-300"><img src="src/assets/NguyenHuongGiang.jpg" alt="Thành viên" className="w-full h-full object-cover" /></div><h4 className="text-xl font-bold mb-1">Nguyễn Hương Giang</h4><p className="text-brand text-sm">Social Media Manager</p></div>
            <div className="group"><div className="w-32 h-32 mx-auto rounded-full overflow-hidden mb-6 shadow-xl shadow-brand/20 border-4 border-white group-hover:-translate-y-2 transition duration-300"><img src="src/assets/LuuVuChauGiang.jpg" alt="Thành viên" className="w-full h-full object-cover" /></div><h4 className="text-xl font-bold mb-1">Lưu Vũ Châu Giang</h4><p className="text-brand text-sm"> Content Writer</p></div>
            <div className="group"><div className="w-32 h-32 mx-auto rounded-full overflow-hidden mb-6 shadow-xl shadow-brand/20 border-4 border-white group-hover:-translate-y-2 transition duration-300"><img src="src/assets/NguyenChauGiang.jpg" alt="Thành viên" className="w-full h-full object-cover" /></div><h4 className="text-xl font-bold mb-1">Nguyễn Châu Giang</h4><p className="text-brand text-sm">Editor</p></div>
            
            <div className="group md:col-start-2">
              <div className="w-32 h-32 mx-auto rounded-full overflow-hidden mb-6 shadow-xl shadow-brand/20 border-4 border-white group-hover:-translate-y-2 transition duration-300">
                <img src="https://scontent-atl3-1.xx.fbcdn.net/v/t1.15752-9/678589465_958977559842058_5376383858371377142_n.jpg?stp=dst-jpg_s960x960_tt6&_nc_cat=106&ccb=1-7&_nc_sid=9f807c&_nc_ohc=j3CSNO964IsQ7kNvwF6oGP8&_nc_oc=Adrs2J1ByHsaNcb7YL3Oo7tmN0b6R3eaC_Ba-AQzlJ5lFjAhkbfhkXXD0j0Tr1B8dURCuxIGRk4W5iDYFtsBNdl8&_nc_ad=z-m&_nc_cid=0&_nc_zt=23&_nc_ht=scontent-atl3-1.xx&oh=03_Q7cD5AEZFdRqjSKdvJEEkguo1orQ2oQbeJaNkIhCXosdYQJefw&oe=6A19AD3D" alt="Lam Giang" className="w-full h-full object-cover" />
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-1">Hoàng Lam Giang</h4>
              <p className="text-brand font-medium text-sm">Tester</p>
            </div>
            <div className="group">
              <div className="w-32 h-32 mx-auto rounded-full overflow-hidden mb-6 shadow-xl border-4 border-white group-hover:-translate-y-2 transition duration-300">
                <img src="src/assets/NgoHuongGiang.jpg" alt="Thành viên" className="w-full h-full object-cover" />
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-1">Ngô Hương Giang</h4>
              <p className="text-brand font-medium text-sm">Developer</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-[#111827] pt-16 pb-8">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-12">
            <div className="flex flex-col items-start">
              <div className="flex items-center gap-2 text-brand font-bold text-xl md:text-2xl tracking-tight mb-4">Hôm nay ăn gì?</div>
              <p className="text-gray-400 text-sm leading-relaxed">Giải pháp thông minh cho bữa ăn hàng ngày của bạn.</p>
            </div>
            <div>
              <h4 className="text-white font-bold text-lg mb-4">Liên hệ</h4>
              <div className="space-y-3 text-gray-400 text-sm">
                <p>Email: support@homnayangi.vn</p><p>Điện thoại: 035 788 616</p>
              </div>
            </div>
            <div>
              <h4 className="text-white font-bold text-lg mb-4">Theo dõi chúng tôi</h4>
              <div className="flex gap-4 text-gray-400 text-sm mb-6"><a href="#">Facebook</a><a href="#">Instagram</a></div>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 flex justify-center items-center"><p className="text-gray-500 text-sm">&copy; 2026 Hôm nay ăn gì? - All rights reserved.</p></div>
        </div>
      </footer>
    </div>
  );
}

export default App;