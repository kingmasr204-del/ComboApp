# ComboApp APK

ده مشروع Android حقيقي مبني على ملفات ComboApp الحالية داخل WebView، وليس PWA.

## أسرع طريقة لإخراج APK
1. ارفع المجلد كله إلى GitHub في مستودع جديد أو نفس مستودع المشروع.
2. افتح تبويب Actions.
3. شغّل **Build ComboApp APK**.
4. بعد نجاح البناء، افتح الـworkflow ثم Artifacts.
5. حمّل `ComboApp-debug-apk.zip` واستخرج `app-debug.apk`.
6. ابعت APK لأي شخص على واتساب/ماسنجر أو ثبته على هاتف Android.

## ملاحظة للنشر على Google Play
الـdebug APK مناسب للتجربة والتوزيع المباشر. للنشر على Google Play نطلع Release AAB موقّع بمفتاح خاص، ونحافظ على نفس applicationId `com.comboapp.chat`.
