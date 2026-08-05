export const compressImage = (file: File, maxSizeMB: number = 0.15): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Max dimension size
        const MAX_DIMENSION = 1600;

        if (width > height) {
          if (width > MAX_DIMENSION) {
            height *= MAX_DIMENSION / width;
            width = MAX_DIMENSION;
          }
        } else {
          if (height > MAX_DIMENSION) {
            width *= MAX_DIMENSION / height;
            height = MAX_DIMENSION;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Attempt recursive compression to fit target size
        let quality = 0.9;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);

        // rough estimation: base64 is 4/3 the size of binary. 
        // 1MB = 1048576 bytes. We target 0.5MB = 500,000 bytes.
        // base64 length = 500,000 * 4/3 = 666,666 chars
        const targetLen = maxSizeMB * 1024 * 1024 * 1.33;

        while (dataUrl.length > targetLen && quality > 0.1) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};
