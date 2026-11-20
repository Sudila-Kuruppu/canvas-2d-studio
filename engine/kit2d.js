(function () {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth01 = (t) => {
    const x = clamp(t, 0, 1);
    return x * x * (3 - 2 * x);
  };
  const ramp = (t, t0, dur) => smooth01((t - t0) / Math.max(1e-5, dur));
  const rng = (seed) => {
    let s = (seed >>> 0) || 1;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  };

  // 2-Bone Analytical IK (Canvas 2D: +X right, +Y down)
  function solve2BoneIK(ax, ay, tx, ty, L1, L2, bendSign) {
    const dx = tx - ax;
    const dy = ty - ay;
    const minD = Math.abs(L1 - L2) + 0.01;
    const maxD = L1 + L2 - 0.01;
    const d = clamp(Math.hypot(dx, dy), minD, maxD);
    const base = Math.atan2(dy, dx);
    const cosA = clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1);
    const theta1 = base + bendSign * Math.acos(cosA);
    const kx = ax + L1 * Math.cos(theta1);
    const ky = ay + L1 * Math.sin(theta1);
    const theta2 = Math.atan2(ty - ky, tx - kx);
    return { jx: kx, jy: ky, ex: kx + L2 * Math.cos(theta2), ey: ky + L2 * Math.sin(theta2), theta1, theta2 };
  }

  function drawCapsule(ctx, x1, y1, x2, y2, width, fill, stroke = '#18141c', lineW = 4.5) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (lineW > 0) {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = stroke;
      ctx.lineWidth = width + lineW * 2;
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = fill;
    ctx.lineWidth = width;
    ctx.stroke();
    ctx.restore();
  }

  function roundRectPath(ctx, x, y, w, h, r) {
    const rad = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.lineTo(x + w - rad, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
    ctx.lineTo(x + w, y + h - rad);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
    ctx.lineTo(x + rad, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
    ctx.lineTo(x, y + rad);
    ctx.quadraticCurveTo(x, y, x + rad, y);
    ctx.closePath();
  }

  function drawRoundedBox(ctx, x, y, w, h, r, fill, stroke = '#18141c', lineW = 4.5) {
    ctx.save();
    roundRectPath(ctx, x, y, w, h, r);
    ctx.fillStyle = fill;
    ctx.fill();
    if (lineW > 0) {
      ctx.lineWidth = lineW;
      ctx.strokeStyle = stroke;
      ctx.stroke();
    }
    ctx.restore();
  }

  function wrapLines(ctx, text, maxW) {
    const words = String(text || '').split(/\s+/);
    const lines = [];
    let cur = '';
    for (const w of words) {
      const test = cur ? `${cur} ${w}` : w;
      if (ctx.measureText(test).width > maxW && cur) {
        lines.push(cur);
        cur = w;
      } else {
        cur = test;
      }
    }
    if (cur) lines.push(cur);
    return lines;
  }

  // Ground-locked footprint walk cycle (upright posture, zero moonwalking)
  function computeWalkPose(t, t0, t1, startX, endX, groundY = 0, opts = {}) {
    const stepLen = opts.stepLen || 42;
    const liftH = opts.liftH || 24;
    const dur = Math.max(0.1, t1 - t0);
    const dist = endX - startX;
    const dir = dist >= 0 ? 1 : -1;
    const totalDist = Math.abs(dist);
    const numSteps = Math.max(2, Math.round(totalDist / stepLen));

    const standH = groundY - 91.6; // upright legs (only ~3 deg soft knee)
    if (t <= t0) {
      return {
        hipsX: startX, hipsY: standH,
        footLX: startX - 6, footLY: groundY, footLAng: 0,
        footRX: startX + 6, footRY: groundY, footRAng: 0,
        armSwing: 0, moving: false, dir
      };
    }
    if (t >= t1) {
      return {
        hipsX: endX, hipsY: standH,
        footLX: endX - 6, footLY: groundY, footLAng: 0,
        footRX: endX + 6, footRY: groundY, footRAng: 0,
        armSwing: 0, moving: false, dir
      };
    }

    const u = (t - t0) / dur;
    const phase = u * numSteps;
    const stepIdx = Math.min(numSteps - 1, Math.floor(phase));
    const frac = phase - stepIdx;

    const fpAt = (i, baseOff) => {
      if (i <= 0) return startX + baseOff;
      if (i >= numSteps) return endX + baseOff;
      return startX + dir * (i / numSteps) * totalDist;
    };

    function footTrack(isLeft) {
      const baseOff = isLeft ? -6 : 6;
      const movesOnThisStep = (stepIdx % 2 === 0) ? isLeft : !isLeft;
      if (movesOnThisStep) {
        const prevIdx = stepIdx === 0 ? 0 : stepIdx - 1;
        const nextIdx = Math.min(numSteps, stepIdx + 1);
        const s = smooth01(frac);
        const x = lerp(fpAt(prevIdx, baseOff), fpAt(nextIdx, baseOff), s);
        const lift = Math.sin(Math.PI * frac);
        const y = groundY - liftH * lift;
        // Toe-off tilt at start -> heel-strike tilt before plant
        const ang = dir * (0.34 * Math.cos(Math.PI * frac));
        return { x, y, ang };
      }
      return { x: fpAt(stepIdx, baseOff), y: groundY, ang: 0 };
    }

    const fl = footTrack(true);
    const fr = footTrack(false);

    // Real weight bob: dips down just after contact (frac ~0.2), rises smoothly at passing (frac ~0.6)
    const bob = -5.5 * Math.sin(Math.PI * frac);
    const hipsX = 0.5 * (fl.x + fr.x);
    const hipsY = groundY - 85.5 + bob;
    const armSwing = Math.sin(Math.PI * phase) * 34 * dir;

    return {
      hipsX, hipsY,
      footLX: fl.x, footLY: fl.y, footLAng: fl.ang,
      footRX: fr.x, footRY: fr.y, footRAng: fr.ang,
      armSwing, moving: true, dir
    };
  }

  class Character {
    constructor(opts = {}) {
      this.name = opts.name || 'Char';
      this.skin = opts.skin || '#f6cfa8';
      this.shirt = opts.shirt || '#2f6fed';
      this.pants = opts.pants || '#2e3648';
      this.hair = opts.hair || '#3a2417';
      this.shoe = opts.shoe || '#1d222d';
      this.outline = opts.outline || '#18141c';
      this.lineW = opts.lineW || 4.5;
      this.hat = opts.hat || 'none';
      this.beard = !!opts.beard;
      this.sash = opts.sash || null;

      this.thighLen = 46;
      this.shinLen = 46;
      this.upperArmLen = 38;
      this.forearmLen = 38;
      this.torsoH = 66;
      this.torsoW = 42;
      this.headR = 33;

      this.resetPose(opts.x || 0, opts.groundY || 0, opts.turn ?? 0.7);
    }

    resetPose(x = 0, groundY = 0, turn = 0.7) {
      this.turn = turn;
      this.hips = { x, y: groundY - 91.6 }; // Upright legs (no squat!)
      this.chestBob = 0; // Breathing moves chest/head without bending knees!
      this.torsoLean = 0;
      this.headTilt = 0;
      this.mood = 'neutral';
      this.blink = 0;
      this.gaze = null;

      this.footL = { x: x - 6, y: groundY, ang: 0 };
      this.footR = { x: x + 6, y: groundY, ang: 0 };
      this.handLTarget = null;
      this.handRTarget = null;
      this.armLAngleOffset = 0;
      this.armRAngleOffset = 0;
      this.attachedProps = { L: null, R: null };
      this.facingSign = turn >= 0 ? 1 : -1;
    }

    autoBlink(t, period = 3.2, offset = 0) {
      const p = (t + offset) % period;
      if (p < 0.08) this.blink = smooth01(p / 0.08);
      else if (p < 0.16) this.blink = 1 - smooth01((p - 0.08) / 0.08);
      else this.blink = 0;
    }

    autoBreathe(t, amp = 1.8, freq = 2.6) {
      this.chestBob = Math.sin(t * freq) * amp;
    }

    applyWalk(walkPose) {
      this.hips.x = walkPose.hipsX;
      this.hips.y = walkPose.hipsY;
      this.footL = { x: walkPose.footLX, y: walkPose.footLY, ang: walkPose.footLAng };
      this.footR = { x: walkPose.footRX, y: walkPose.footRY, ang: walkPose.footRAng };
      this.torsoLean = walkPose.moving ? walkPose.dir * 0.07 : 0;
      this.armLAngleOffset = walkPose.armSwing;
      this.armRAngleOffset = -walkPose.armSwing;
    }

    // Natural sit-down with planted feet (no sliding!)
    sitDown(t, tStart, dur, standX, chair, groundY = 0) {
      const seat = chair.seatAnchor(groundY);
      const u = ramp(t, tStart, dur);
      // Feet step/settle onto seat.footX in first 35%, then stay PINNED while hips lower onto seat
      const stepU = ramp(t, tStart, dur * 0.35);
      const lowerU = ramp(t, tStart + dur * 0.25, dur * 0.75);

      const footCenter = lerp(standX, seat.footX, stepU);
      const stepLift = Math.sin(Math.PI * stepU) * (Math.abs(seat.footX - standX) > 6 ? 12 : 0);
      this.footL = { x: footCenter - 5, y: groundY - stepLift, ang: 0 };
      this.footR = { x: footCenter + 5, y: groundY, ang: 0 };

      this.turn = seat.facing >= 0 ? 0.74 : -0.74;
      this.hips.x = lerp(standX, seat.x, lowerU);
      this.hips.y = lerp(groundY - 91.6, seat.seatY - 7, lowerU);
      // Real weight shift: lean slightly forward mid-sit, then settle against backrest
      const leanForward = Math.sin(Math.PI * lowerU) * 0.16 * seat.facing;
      this.torsoLean = leanForward + lerp(0, -0.05 * seat.facing, lowerU);
    }

    sitOn(chair, groundY = 0) {
      const a = chair.seatAnchor(groundY);
      this.turn = a.facing >= 0 ? 0.74 : -0.74;
      this.hips.x = a.x;
      this.hips.y = a.seatY - 7;
      this.torsoLean = -0.05 * a.facing;
      this.footL = { x: a.footX - 5, y: groundY, ang: 0 };
      this.footR = { x: a.footX + 5, y: groundY, ang: 0 };
    }

    getSkeleton() {
      const t = this.turn;
      const absT = Math.abs(t);
      const fSign = t >= 0 ? 1 : -1;
      const lean = this.torsoLean;
      const effTorsoH = this.torsoH + this.chestBob;

      const shX = this.hips.x + Math.sin(lean) * effTorsoH;
      const shY = this.hips.y - Math.cos(lean) * effTorsoH;
      const shoulderCenter = { x: shX, y: shY + 10 };

      const shHalf = lerp(22, 4, clamp(absT, 0, 1));
      const hipHalf = lerp(12, 3, clamp(absT, 0, 1));

      const shL = { x: shoulderCenter.x - shHalf, y: shoulderCenter.y };
      const shR = { x: shoulderCenter.x + shHalf, y: shoulderCenter.y };
      const hipL = { x: this.hips.x - hipHalf, y: this.hips.y };
      const hipR = { x: this.hips.x + hipHalf, y: this.hips.y };

      const headCenter = {
        x: shX + Math.sin(lean + this.headTilt) * (this.headR + 4),
        y: shY - Math.cos(lean + this.headTilt) * (this.headR + 4)
      };

      const mouthPos = {
        x: headCenter.x + t * 14,
        y: headCenter.y + 13
      };

      const kneeBend = fSign >= 0 ? -1 : 1;
      const legL = solve2BoneIK(hipL.x, hipL.y, this.footL.x, this.footL.y, this.thighLen, this.shinLen, kneeBend);
      const legR = solve2BoneIK(hipR.x, hipR.y, this.footR.x, this.footR.y, this.thighLen, this.shinLen, kneeBend);

      const elbowBend = fSign >= 0 ? 1 : -1;
      const defHandL = {
        x: shL.x - 4 + (this.armLAngleOffset || 0) * 0.9,
        y: shL.y + 66 - Math.abs(this.armLAngleOffset || 0) * 0.25
      };
      const defHandR = {
        x: shR.x + 4 + (this.armRAngleOffset || 0) * 0.9,
        y: shR.y + 66 - Math.abs(this.armRAngleOffset || 0) * 0.25
      };

      const tgtL = this.handLTarget || defHandL;
      const tgtR = this.handRTarget || defHandR;
      const armL = solve2BoneIK(shL.x, shL.y, tgtL.x, tgtL.y, this.upperArmLen, this.forearmLen, elbowBend);
      const armR = solve2BoneIK(shR.x, shR.y, tgtR.x, tgtR.y, this.upperArmLen, this.forearmLen, elbowBend);

      return { shL, shR, hipL, hipR, legL, legR, armL, armR, shX, shY, effTorsoH, headCenter, mouthPos, fSign };
    }

    pushToQueue(queue, baseZ = 100, groundY = 0) {
      const sk = this.getSkeleton();
      const t = this.turn;
      const fSign = sk.fSign;

      // Ground shadow
      queue.push({
        z: baseZ - 50,
        draw: (ctx) => {
          ctx.save();
          ctx.fillStyle = 'rgba(0,0,0,0.18)';
          ctx.beginPath();
          ctx.ellipse(this.hips.x, groundY + 3, 30, 8, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      });

      const farIsR = t > 0.15;
      const backArmZ = baseZ - 6;
      const backLegZ = baseZ - 4;
      const torsoZ = baseZ;
      const frontLegZ = baseZ + 2;
      const headZ = baseZ + 4;
      const frontArmZ = baseZ + 6;

      const drawLeg = (hip, leg, foot, isBack) => (ctx) => {
        const col = isBack ? shadeHex(this.pants, -14) : this.pants;
        drawCapsule(ctx, hip.x, hip.y, leg.jx, leg.jy, 12, col, this.outline, this.lineW);
        drawCapsule(ctx, leg.jx, leg.jy, leg.ex, leg.ey, 11, col, this.outline, this.lineW);
        ctx.save();
        ctx.translate(leg.ex, leg.ey);
        ctx.rotate(foot.ang || 0);
        const dir = Math.abs(t) < 0.2 ? (isBack ? -0.3 : 0.3) : fSign;
        ctx.fillStyle = this.shoe;
        ctx.strokeStyle = this.outline;
        ctx.lineWidth = this.lineW;
        ctx.beginPath();
        ctx.ellipse(dir * 7, 3, 13, 6.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      };

      const drawArm = (sh, arm, handTarget, sideKey, isBack) => (ctx) => {
        const col = isBack ? shadeHex(this.shirt, -16) : this.shirt;
        drawCapsule(ctx, sh.x, sh.y, arm.jx, arm.jy, 10, col, this.outline, this.lineW);
        drawCapsule(ctx, arm.jx, arm.jy, arm.ex, arm.ey, 9.5, col, this.outline, this.lineW);

        const prop = this.attachedProps[sideKey];
        if (prop) {
          prop.drawAt(ctx, arm.ex, arm.ey, (handTarget && handTarget.tilt) || 0, fSign);
        }

        ctx.save();
        ctx.fillStyle = this.skin;
        ctx.strokeStyle = this.outline;
        ctx.lineWidth = this.lineW * 0.85;
        ctx.beginPath();
        ctx.arc(arm.ex, arm.ey, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      };

      queue.push({ z: farIsR ? backLegZ : frontLegZ, draw: drawLeg(sk.hipR, sk.legR, this.footR, farIsR) });
      queue.push({ z: farIsR ? frontLegZ : backLegZ, draw: drawLeg(sk.hipL, sk.legL, this.footL, !farIsR) });

      const liftL = !!this.handLTarget || !!this.attachedProps.L;
      const liftR = !!this.handRTarget || !!this.attachedProps.R;
      queue.push({
        z: liftR ? frontArmZ + 1 : (farIsR ? backArmZ : frontArmZ),
        draw: drawArm(sk.shR, sk.armR, this.handRTarget, 'R', farIsR && !liftR)
      });
      queue.push({
        z: liftL ? frontArmZ + 1 : (farIsR ? frontArmZ : backArmZ),
        draw: drawArm(sk.shL, sk.armL, this.handLTarget, 'L', !farIsR && !liftL)
      });

      // Torso
      queue.push({
        z: torsoZ,
        draw: (ctx) => {
          ctx.save();
          ctx.translate(this.hips.x, this.hips.y);
          ctx.rotate(this.torsoLean);
          const w = lerp(this.torsoW, 28, Math.abs(t));
          drawRoundedBox(ctx, -w / 2, -sk.effTorsoH, w, sk.effTorsoH + 8, 16, this.shirt, this.outline, this.lineW);
          if (this.sash) {
            ctx.strokeStyle = this.sash;
            ctx.lineWidth = 7;
            ctx.beginPath();
            ctx.moveTo(-w * 0.36, -sk.effTorsoH + 10);
            ctx.lineTo(w * 0.38, -6);
            ctx.stroke();
          }
          ctx.restore();
        }
      });

      // Head + Face + Beard + Hat
      queue.push({
        z: headZ,
        draw: (ctx) => {
          ctx.save();
          ctx.translate(sk.headCenter.x, sk.headCenter.y);
          ctx.rotate(this.torsoLean + this.headTilt);

          ctx.fillStyle = this.skin;
          ctx.strokeStyle = this.outline;
          ctx.lineWidth = this.lineW;
          ctx.beginPath();
          ctx.arc(0, 0, this.headR, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = this.hair;
          ctx.beginPath();
          ctx.arc(0, -4, this.headR, Math.PI * 1.05, Math.PI * 1.95);
          ctx.quadraticCurveTo(0, -this.headR * 0.35, -this.headR * 0.98, -8);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          const fx = t * 14;
          const eyeSpread = lerp(11, 7.5, Math.abs(t));
          const eyeY = -3;

          let px = t * 2.0, py = 0;
          if (this.gaze) {
            const gx = this.gaze.x - sk.headCenter.x;
            const gy = this.gaze.y - sk.headCenter.y;
            const gd = Math.max(1, Math.hypot(gx, gy));
            px = clamp((gx / gd) * 3.0, -3.0, 3.0);
            py = clamp((gy / gd) * 2.2, -2.2, 2.2);
          }

          const drawEye = (ex, scaleW) => {
            ctx.save();
            ctx.translate(ex, eyeY);
            if (this.mood === 'happy' || this.mood === 'sip') {
              ctx.strokeStyle = this.outline;
              ctx.lineWidth = 3.2;
              ctx.lineCap = 'round';
              ctx.beginPath();
              ctx.arc(0, 2, 5.5 * scaleW, Math.PI * 1.1, Math.PI * 1.9);
              ctx.stroke();
            } else if (this.blink > 0.45) {
              ctx.strokeStyle = this.outline;
              ctx.lineWidth = 3;
              ctx.beginPath();
              ctx.moveTo(-5 * scaleW, 0);
              ctx.lineTo(5 * scaleW, 0);
              ctx.stroke();
            } else {
              const r = this.mood === 'surprised' ? 6.5 : 5.2;
              ctx.fillStyle = '#ffffff';
              ctx.strokeStyle = this.outline;
              ctx.lineWidth = 2.4;
              ctx.beginPath();
              ctx.ellipse(0, 0, r * scaleW, r * (1 - this.blink * 0.8), 0, 0, Math.PI * 2);
              ctx.fill();
              ctx.stroke();
              ctx.fillStyle = '#141418';
              ctx.beginPath();
              ctx.arc(px * scaleW, py, 2.5, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.strokeStyle = this.hair;
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            const browTilt = this.mood === 'angry' ? 0.35 : (this.mood === 'sad' ? -0.28 : 0);
            const browLift = this.mood === 'surprised' ? -3 : 0;
            ctx.beginPath();
            ctx.moveTo(-5 * scaleW, -9 + browLift - browTilt * 4);
            ctx.lineTo(5 * scaleW, -9 + browLift + browTilt * 4);
            ctx.stroke();
            ctx.restore();
          };

          const farEyeShrink = t > 0.2 ? 0.72 : 1.0;
          const nearEyeShrink = t < -0.2 ? 0.72 : 1.0;
          if (t < 0.88) drawEye(fx - eyeSpread, nearEyeShrink);
          if (t > -0.88) drawEye(fx + eyeSpread, farEyeShrink);

          // Chin beard positioned cleanly below the mouth so smiles/expressions stay clear
          if (this.beard) {
            ctx.fillStyle = this.hair;
            ctx.strokeStyle = this.outline;
            ctx.lineWidth = 3.2;
            ctx.beginPath();
            ctx.moveTo(fx - 15, 19);
            ctx.quadraticCurveTo(fx, 43, fx + 15, 19);
            ctx.quadraticCurveTo(fx, 23, fx - 15, 19);
            ctx.fill();
            ctx.stroke();
          }

          ctx.strokeStyle = this.outline;
          ctx.lineWidth = 3;
          ctx.lineCap = 'round';
          ctx.beginPath();
          if (this.mood === 'happy') {
            ctx.arc(fx, 10, 6.5, 0.15, Math.PI - 0.15);
            ctx.stroke();
          } else if (this.mood === 'surprised' || this.mood === 'sip') {
            ctx.fillStyle = '#5a1e24';
            ctx.ellipse(fx, 13, 3.8, 4.8, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          } else if (this.mood === 'sad' || this.mood === 'angry') {
            ctx.arc(fx, 17, 6, Math.PI + 0.3, -0.3);
            ctx.stroke();
          } else {
            ctx.moveTo(fx - 5.5, 12);
            ctx.lineTo(fx + 5.5, 12);
            ctx.stroke();
          }

          if (this.hat === 'crown') {
            ctx.fillStyle = '#f2c138';
            ctx.strokeStyle = this.outline;
            ctx.lineWidth = 3.5;
            ctx.beginPath();
            ctx.moveTo(-20, -24);
            ctx.lineTo(-22, -44);
            ctx.lineTo(-9, -34);
            ctx.lineTo(0, -48);
            ctx.lineTo(9, -34);
            ctx.lineTo(22, -44);
            ctx.lineTo(20, -24);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          } else if (this.hat === 'cap') {
            ctx.fillStyle = '#c83e37';
            ctx.strokeStyle = this.outline;
            ctx.lineWidth = 3.5;
            ctx.beginPath();
            ctx.arc(0, -18, 25, Math.PI, 0);
            ctx.fill();
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(fSign * 6, -18);
            ctx.lineTo(fSign * 34, -15);
            ctx.lineTo(fSign * 8, -12);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          }

          ctx.restore();
        }
      });
    }
  }

  class Chair {
    constructor(opts = {}) {
      this.x = opts.x || 0;
      this.facing = opts.facing ?? 1;
      this.seatHeight = opts.seatHeight || 52;
      this.seatWidth = opts.seatWidth || 52;
      this.backHeight = opts.backHeight || 66;
      this.color = opts.color || '#8b5a36';
      this.cushion = opts.cushion || '#b84339';
      this.outline = '#18141c';
    }
    seatAnchor(groundY = 0) {
      return {
        x: this.x + this.facing * 2,
        seatY: groundY - this.seatHeight,
        footX: this.x + this.facing * 36,
        entryX: this.x + this.facing * 30,
        facing: this.facing
      };
    }
    pushToQueue(queue, baseZ = 100, groundY = 0) {
      const topY = groundY - this.seatHeight;
      const backX = this.x - this.facing * (this.seatWidth * 0.44);
      const frontX = this.x + this.facing * (this.seatWidth * 0.44);

      queue.push({
        z: baseZ - 12,
        draw: (ctx) => {
          drawCapsule(ctx, backX, topY, backX, groundY, 8, shadeHex(this.color, -15), this.outline, 4);
          drawCapsule(ctx, backX, topY, backX - this.facing * 4, topY - this.backHeight, 10, this.color, this.outline, 4);
        }
      });
      queue.push({
        z: baseZ - 3,
        draw: (ctx) => {
          drawCapsule(ctx, frontX, topY + 2, frontX, groundY, 8, this.color, this.outline, 4);
          drawRoundedBox(ctx, this.x - this.seatWidth / 2, topY - 6, this.seatWidth, 14, 5, this.cushion, this.outline, 4);
        }
      });
    }
  }

  class Table {
    constructor(opts = {}) {
      this.x = opts.x || 0;
      this.width = opts.width || 110;
      this.height = opts.height || 82;
      this.color = opts.color || '#9a653c';
      this.outline = '#18141c';
    }
    surface(groundY = 0, offsetX = 0) {
      return { x: this.x + offsetX, y: groundY - this.height };
    }
    pushToQueue(queue, z = 115, groundY = 0) {
      const topY = groundY - this.height;
      const lx = this.x - this.width * 0.40;
      const rx = this.x + this.width * 0.40;
      queue.push({
        z,
        draw: (ctx) => {
          drawCapsule(ctx, lx, topY + 6, lx, groundY, 9, shadeHex(this.color, -12), this.outline, 4);
          drawCapsule(ctx, rx, topY + 6, rx, groundY, 9, shadeHex(this.color, -12), this.outline, 4);
          drawRoundedBox(ctx, this.x - this.width / 2, topY, this.width, 15, 5, this.color, this.outline, 4);
        }
      });
    }
  }

  class CupProp {
    constructor(opts = {}) {
      this.x = opts.x || 0;
      this.y = opts.y || 0;
      this.color = opts.color || '#e9edf5';
      this.liquid = opts.liquid || '#7b4322';
      this.outline = '#18141c';
      this.tilt = 0;
    }
    gripPoint() {
      return { x: this.x - 10, y: this.y - 12 }; // grab handle side cleanly
    }
    drawCupShape(ctx, cx, cy, tilt = 0, dir = 1) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(tilt);
      ctx.strokeStyle = this.outline;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(-dir * 10, 0, 6, 0, Math.PI * 2);
      ctx.stroke();
      drawRoundedBox(ctx, -10, -12, 20, 24, 4, this.color, this.outline, 3.5);
      ctx.fillStyle = this.liquid;
      ctx.fillRect(-7, -9, 14, 4);
      ctx.restore();
    }
    drawAt(ctx, handX, handY, tilt, dir) {
      // Cup sits forward of the hand gripping the handle so fingers don't block mouth/rim!
      this.drawCupShape(ctx, handX + dir * 10, handY - 2, tilt, dir);
    }
    pushToQueue(queue, z = 118) {
      queue.push({
        z,
        draw: (ctx) => this.drawCupShape(ctx, this.x, this.y - 12, this.tilt, 1)
      });
    }
  }

  function shadeHex(hex, amt) {
    const c = hex.replace('#', '');
    const num = parseInt(c, 16);
    const r = clamp((num >> 16) + amt, 0, 255);
    const g = clamp(((num >> 8) & 255) + amt, 0, 255);
    const b = clamp((num & 255) + amt, 0, 255);
    return `rgb(${r},${g},${b})`;
  }

  const _shots = [];
  let _cfg = { fps: 30, w: 1920, h: 1080 };

  function renderFrame(ctx, W, H, sceneSetupFn) {
    const queue = [];
    const cam = { x: 0, y: -120, zoom: 1.85 };
    const sky = ['#7ec8f2', '#d7f0ff'];
    const overlays = [];

    const api = {
      W, H,
      isPortrait: H > W,
      cam,
      queue,
      setSky(top, bottom) { sky[0] = top; sky[1] = bottom; },
      addCaption(text) { if (text) overlays.push({ type: 'caption', text }); },
      addBanner(title, sub) { overlays.push({ type: 'banner', title, sub }); }
    };

    sceneSetupFn(api);

    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, sky[0]);
    grad.addColorStop(1, sky[1]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    const baseScale = Math.min(W, H) / 1080;
    const totalScale = baseScale * cam.zoom;
    ctx.save();
    ctx.translate(W * 0.5, H * 0.56);
    ctx.scale(totalScale, totalScale);
    ctx.translate(-cam.x, -cam.y);

    queue.sort((a, b) => a.z - b.z);
    for (const item of queue) item.draw(ctx);
    ctx.restore();

    const u = Math.min(W, H) / 720;
    for (const ov of overlays) {
      if (ov.type === 'banner') {
        ctx.save();
        ctx.fillStyle = 'rgba(20, 24, 34, 0.78)';
        roundRectPath(ctx, 28 * u, 28 * u, 330 * u, 68 * u, 14 * u);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = `700 ${Math.round(22 * u)}px system-ui, sans-serif`;
        ctx.fillText(ov.title || '', 46 * u, 58 * u);
        ctx.fillStyle = '#9cc4ff';
        ctx.font = `600 ${Math.round(15 * u)}px system-ui, sans-serif`;
        ctx.fillText(ov.sub || '', 46 * u, 82 * u);
        ctx.restore();
      } else if (ov.type === 'caption') {
        ctx.save();
        const fontSize = Math.round(23 * u);
        const lineH = Math.round(30 * u);
        ctx.font = `600 ${fontSize}px system-ui, sans-serif`;
        ctx.textAlign = 'center';

        const maxBoxW = W - 72 * u;
        const lines = wrapLines(ctx, ov.text, maxBoxW - 44 * u);
        const longest = Math.max(...lines.map((l) => ctx.measureText(l).width));
        const boxW = Math.min(maxBoxW, longest + 44 * u);
        const boxH = lines.length * lineH + 18 * u;
        const bottomMargin = 38 * u;
        const boxY = H - bottomMargin - boxH;

        ctx.fillStyle = 'rgba(15, 18, 26, 0.74)';
        roundRectPath(ctx, (W - boxW) * 0.5, boxY, boxW, boxH, 11 * u);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < lines.length; i++) {
          ctx.fillText(lines[i], W * 0.5, boxY + 29 * u + i * lineH);
        }
        ctx.restore();
      }
    }
  }

  window.K2D = {
    clamp, lerp, smooth01, ramp, rng,
    solve2BoneIK, drawCapsule, drawRoundedBox, computeWalkPose, shadeHex,
    Character, Chair, Table, CupProp,
    config(c) { _cfg = Object.assign(_cfg, c || {}); },
    shot(s) { _shots.push(s); },
    getInfo() {
      return {
        durs: _shots.map((s) => s.dur),
        fps: _cfg.fps || 30,
        w: _cfg.w || 1920,
        h: _cfg.h || 1080
      };
    },
    drawShotFrame(si, f, W, H) {
      const canvas = document.getElementById('stage');
      if (canvas.width !== W || canvas.height !== H) {
        canvas.width = W;
        canvas.height = H;
      }
      const ctx = canvas.getContext('2d');
      const s = _shots[si];
      const fps = _cfg.fps || 30;
      const t = f / fps;
      const k = clamp(t / Math.max(1e-5, s.dur), 0, 1);
      renderFrame(ctx, W, H, (api) => s.draw(api, t, k));
      return canvas.toDataURL('image/jpeg', 0.92);
    }
  };
})();