import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

let faceLandmarker: FaceLandmarker | null = null;

export const initFaceDetection = async () => {
    if (faceLandmarker) return faceLandmarker;

    const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
    );

    faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
            delegate: "GPU"
        },
        outputFaceBlendshapes: true,
        runningMode: "VIDEO",
        numFaces: 1
    });

    return faceLandmarker;
};

// Calculate geometric signature of a face for identity comparison (20-point enhanced)
const getFaceSignature = (landmarks: any[]) => {
    if (!landmarks || landmarks.length < 468) return null;

    const dist = (p1: any, p2: any) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));

    // Key landmark references
    const forehead      = landmarks[10];   // forehead center
    const chin          = landmarks[152];  // chin
    const jawLeft       = landmarks[234];  // left jaw edge
    const jawRight      = landmarks[454];  // right jaw edge
    const noseBridgeTop = landmarks[6];    // nose bridge top
    const noseBridgeBot = landmarks[4];    // nose bridge bottom
    const noseTip       = landmarks[1];    // nose tip
    const leftEyeOuter  = landmarks[33];   // left eye outer corner
    const leftEyeInner  = landmarks[133];  // left eye inner corner
    const rightEyeInner = landmarks[362];  // right eye inner corner
    const rightEyeOuter = landmarks[263];  // right eye outer corner
    const leftEyebrow   = landmarks[70];   // left eyebrow
    const rightEyebrow  = landmarks[300];  // right eyebrow
    const leftCheek     = landmarks[93];   // left cheekbone
    const rightCheek    = landmarks[323];  // right cheekbone
    const philtrum      = landmarks[0];    // philtrum top
    const lipBottom     = landmarks[17];   // lip bottom
    const mouthLeft     = landmarks[61];   // mouth left corner
    const mouthRight    = landmarks[291];  // mouth right corner

    // Base distance for normalization (eye-to-eye outer distance)
    const eyeDist = dist(leftEyeOuter, rightEyeOuter);
    if (eyeDist === 0) return null;

    return [
        // Core facial proportions
        dist(leftEyeOuter, noseTip) / eyeDist,           // 1. Left eye to nose tip
        dist(rightEyeOuter, noseTip) / eyeDist,          // 2. Right eye to nose tip
        dist(mouthLeft, mouthRight) / eyeDist,           // 3. Mouth width
        dist(noseTip, chin) / eyeDist,                   // 4. Nose tip to chin
        dist(leftEyeOuter, mouthLeft) / eyeDist,         // 5. Left eye to mouth corner
        dist(rightEyeOuter, mouthRight) / eyeDist,       // 6. Right eye to mouth corner
        // Eye measurements
        dist(leftEyeOuter, leftEyeInner) / eyeDist,      // 7. Left eye width
        dist(rightEyeInner, rightEyeOuter) / eyeDist,    // 8. Right eye width
        // Face height and jaw
        dist(forehead, chin) / eyeDist,                  // 9. Face height (forehead to chin)
        dist(jawLeft, jawRight) / eyeDist,               // 10. Jaw width
        // Nose
        dist(noseBridgeTop, noseBridgeBot) / eyeDist,    // 11. Nose bridge length
        dist(forehead, noseTip) / eyeDist,               // 12. Forehead to nose tip
        // Eyebrows
        dist(leftEyebrow, rightEyebrow) / eyeDist,       // 13. Eyebrow span
        dist(leftEyebrow, leftEyeOuter) / eyeDist,       // 14. Left eyebrow-to-eye gap
        dist(rightEyebrow, rightEyeOuter) / eyeDist,     // 15. Right eyebrow-to-eye gap
        // Cheekbones
        dist(leftCheek, rightCheek) / eyeDist,           // 16. Cheekbone width
        // Philtrum & lips
        dist(philtrum, lipBottom) / eyeDist,             // 17. Philtrum length
        dist(landmarks[61], landmarks[146]) / eyeDist,   // 18. Lip thickness
        // Structural ratios
        dist(noseBridgeTop, chin) / eyeDist,             // 19. Nose bridge to chin
        dist(leftCheek, chin) / eyeDist,                 // 20. Cheek-to-chin (jaw depth)
    ];
};

let lastTimestamp = 0;

// Liveness detection: check blink or head turn from a live video frame
export const checkLiveness = async (
    video: HTMLVideoElement,
    challenge: 'blink' | 'turn_left' | 'turn_right'
): Promise<{ passed: boolean; message: string }> => {
    try {
        const landmarker = await initFaceDetection();

        // Ensure strictly increasing timestamp
        const now = performance.now();
        const ts = now > lastTimestamp ? now : lastTimestamp + 1;
        lastTimestamp = ts;

        const result = landmarker.detectForVideo(video, ts);

        if (!result.faceLandmarks || result.faceLandmarks.length === 0) {
            return { passed: false, message: "ไม่พบใบหน้าในกล้อง" };
        }

        if (challenge === 'blink') {
            // Use faceBlendshapes for blink detection
            const blendshapes = result.faceBlendshapes?.[0]?.categories;
            if (!blendshapes) {
                return { passed: false, message: "ไม่สามารถตรวจสอบการกะพริบตาได้" };
            }
            const eyeBlinkLeft  = blendshapes.find(c => c.categoryName === 'eyeBlinkLeft')?.score  ?? 0;
            const eyeBlinkRight = blendshapes.find(c => c.categoryName === 'eyeBlinkRight')?.score ?? 0;
            const blinked = eyeBlinkLeft > 0.4 || eyeBlinkRight > 0.4;
            return {
                passed: blinked,
                message: blinked ? "ตรวจพบการกะพริบตา ✓" : "กรุณากะพริบตา"
            };
        } else {
            // Head yaw detection: compare nose tip x vs face center x
            const landmarks = result.faceLandmarks[0];
            const noseTip   = landmarks[4];   // nose bridge bottom (close to tip)
            const jawLeft   = landmarks[234];
            const jawRight  = landmarks[454];
            const faceCenter = (jawLeft.x + jawRight.x) / 2;
            const yawOffset  = noseTip.x - faceCenter;
            const threshold  = 0.04; // normalized coordinate threshold

            if (challenge === 'turn_left') {
                const turned = yawOffset < -threshold;
                return {
                    passed: turned,
                    message: turned ? "ตรวจพบการหันซ้าย ✓" : "กรุณาหันหน้าไปทางซ้าย"
                };
            } else {
                const turned = yawOffset > threshold;
                return {
                    passed: turned,
                    message: turned ? "ตรวจพบการหันขวา ✓" : "กรุณาหันหน้าไปทางขวา"
                };
            }
        }
    } catch (error) {
        console.error("Liveness Check Error:", error);
        return { passed: false, message: "ระบบตรวจสอบ Liveness ขัดข้อง" };
    }
};

export const verifyFaceLocal = async (
    capturedImage: HTMLImageElement | HTMLVideoElement,
    storedSignature?: number[]
): Promise<{ verified: boolean; confidence: number; signature: number[]; message: string }> => {
    try {
        const landmarker = await initFaceDetection();
        const now2 = performance.now();
        const ts2 = now2 > lastTimestamp ? now2 : lastTimestamp + 1;
        lastTimestamp = ts2;
        const result = landmarker.detectForVideo(capturedImage as any, ts2);

        if (!result.faceLandmarks || result.faceLandmarks.length === 0) {
            return { verified: false, confidence: 0, signature: [], message: "ไม่พบใบหน้าในกล้อง" };
        }

        const currentSignature = getFaceSignature(result.faceLandmarks[0]);
        if (!currentSignature) {
            return { verified: false, confidence: 0, signature: [], message: "ไม่สามารถประมวลผลจุดสำคัญบนใบหน้าได้" };
        }

        if (!storedSignature || storedSignature.length === 0) {
            return { verified: true, confidence: 1, signature: currentSignature, message: "บันทึกใบหน้าเรียบร้อย" };
        }

        // Compare signatures
        let diff = 0;
        const minLen = Math.min(currentSignature.length, storedSignature.length);
        for (let i = 0; i < minLen; i++) {
            diff += Math.pow(currentSignature[i] - storedSignature[i], 2);
        }
        const score = Math.max(0, 1 - Math.sqrt(diff) * 1.5);

        const isIdentityMatch = score > 0.85; // Increased from 0.78 to 0.85 for higher security

        return {
            verified: isIdentityMatch,
            confidence: score,
            signature: currentSignature,
            message: isIdentityMatch ? "ยืนยันตัวตนสำเร็จ" : "ใบหน้าไม่ตรงกับที่บันทึกไว้"
        };
    } catch (error) {
        console.error("Local Face Verification Error:", error);
        return { verified: false, confidence: 0, signature: [], message: "ระบบประมวลผลใบหน้าขัดข้อง" };
    }
};
