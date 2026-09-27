ComboApp — NETLIFY READY

النسخة دي جاهزة للرفع على Netlify.

1) فك الضغط.
2) ارفع محتويات المجلد نفسها إلى Netlify (المجلد الذي بداخله index.html مباشرة).
3) بعد ظهور رابط Netlify HTTPS، ادخل Supabase:
   Authentication > URL Configuration
   - Site URL = رابط Netlify النهائي
   - Redirect URLs = نفس الرابط النهائي
4) Authentication > Providers > Email:
   فعّل Confirm email لو عايز تأكيد البريد.
5) Password reset:
   زر "نسيت كلمة السر" في التطبيق يستخدم رابط الموقع الحالي تلقائيًا، وليس 127.0.0.1.
6) لو فتحت رابط استرجاع قديم كان صادرًا قبل النشر، اطلب رسالة جديدة بعد ضبط Site URL.
7) اسم المرسل "ComboApp" وشعار ComboApp داخل رسالة البريد لا يتم التحكم فيهما من JavaScript.
   لازم Custom SMTP في Supabase (مثل Resend/SendGrid/Mailgun)، مع وضع الشعار على رابط HTTPS.
8) لا تضع Service Role/Secret Key في التطبيق. المفتاح الموجود في app.js هو publishable فقط.
9) مكالمات الصوت والفيديو تحتاج HTTPS وصلاحية الكاميرا/الميكروفون، وTURN server مطلوب لاحقًا لبعض الشبكات.

مهم:
- _redirects و netlify.toml موجودان لتفادي مشاكل فتح روابط الاسترجاع/الروابط المباشرة.
- لا ترفع ملف ZIP كملف داخل الموقع؛ ارفع محتويات المشروع بحيث يكون index.html في جذر النشر.
