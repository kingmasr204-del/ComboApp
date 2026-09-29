ComboApp V19 — AUTH BUTTONS FIX

تم إصلاح/إضافة:
1) زر دخول كزائر حقيقي باستخدام Supabase Anonymous Auth.
2) ربط زر دخول/إنشاء حساب/نسيت كلمة السر بالدوال بشكل مباشر.
3) رابط إعادة تعيين كلمة السر والتأكيد يستخدم عنوان الصفحة الحالية بدل عنوان ثابت.
4) أضفت COMBOAPP_AUTH_FIX.sql لإضافة INSERT/UPDATE policies المطلوبة لجدول profiles.

مهم:
- شغّل COMBOAPP_AUTH_FIX.sql مرة واحدة في Supabase SQL Editor.
- لتفعيل "دخول كزائر": من Supabase > Authentication > Providers/Sign In methods فعّل Anonymous Sign-Ins.
- ارفع ملفات combo إلى GitHub Pages واستبدل الملفات القديمة.
- اعمل Hard Refresh بعد النشر.
- في Supabase > Authentication > URL Configuration أضف رابط موقع التطبيق (GitHub Pages) إلى Site URL وRedirect URLs.
