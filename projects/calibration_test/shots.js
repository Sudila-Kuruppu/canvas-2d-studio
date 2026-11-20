K2D.config({ fps: 30, w: 1920, h: 1080 });

function drawRoomSet(api, groundY = 0) {
  const { queue } = api;
  api.setSky('#cfdcf0', '#eef3fa');
  queue.push({
    z: -40,
    draw(ctx) {
      ctx.fillStyle = '#e7dcc8';
      ctx.fillRect(-1400, -900, 2800, 900);
      ctx.fillStyle = '#c8b391';
      ctx.fillRect(-1400, -135, 2800, 135);
      ctx.strokeStyle = '#18141c';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-1400, -135);
      ctx.lineTo(1400, -135);
      ctx.stroke();
      K2D.drawRoundedBox(ctx, -260, -290, 150, 130, 8, '#9fd3f5', '#18141c', 4);
      ctx.fillStyle = '#8b6343';
      ctx.fillRect(-1400, groundY, 2800, 600);
      ctx.beginPath();
      ctx.moveTo(-1400, groundY);
      ctx.lineTo(1400, groundY);
      ctx.stroke();
    }
  });
}

// Shared stage layout so Shot 0 -> Shot 1 cuts cleanly with zero jump
const CHAIR_X = 85;
const TABLE_X = 185;
const STAND_ENTRY_X = 116; // Right in front of the chair cushion, clear of backrest!

// Shot 0 (4.0s): Turn smoothly toward +X, grounded IK walk, stop in front of seat
K2D.shot({
  dur: 4.0,
  draw(api, t, k) {
    drawRoomSet(api, 0);

    const chair = new K2D.Chair({ x: CHAIR_X, facing: 1 });
    const table = new K2D.Table({ x: TABLE_X, width: 112, height: 82 });
    const cup = new K2D.CupProp({ ...table.surface(0, -16) });
    chair.pushToQueue(api.queue, 85, 0); // Chair behind King while walking in front of it
    table.pushToQueue(api.queue, 115, 0);
    cup.pushToQueue(api.queue, 118);

    const king = new K2D.Character({
      name: 'King', shirt: '#5b349a', pants: '#2c2538', hair: '#d8d4cf',
      hat: 'crown', beard: true, sash: '#eab839'
    });
    const advisor = new K2D.Character({
      name: 'Advisor', shirt: '#2b6cb0', pants: '#233142', hair: '#4a2f21'
    });

    king.resetPose(-210, 0, K2D.lerp(0, 0.78, K2D.ramp(t, 0.05, 0.35)));
    if (t >= 0.4) {
      const wp = K2D.computeWalkPose(t, 0.4, 3.65, -210, STAND_ENTRY_X, 0, { stepLen: 44, liftH: 24 });
      king.applyWalk(wp);
    }
    king.gaze = { x: 270, y: -155 };
    king.autoBlink(t, 3.1, 0.4);
    king.autoBreathe(t);
    king.pushToQueue(api.queue, 100, 0);

    advisor.resetPose(285, 0, -0.75);
    advisor.autoBreathe(t);
    advisor.autoBlink(t, 3.5, 1.2);
    advisor.gaze = { x: king.hips.x, y: king.hips.y - 95 };
    advisor.mood = t > 2.5 ? 'happy' : 'neutral';
    if (t > 1.8 && t < 3.4) {
      const w = Math.sin((t - 1.8) * 10) * 14;
      advisor.handLTarget = { x: 240 + w, y: -155 };
    }
    advisor.pushToQueue(api.queue, 100, 0);

    api.cam.x = K2D.lerp(-40, 115, K2D.smooth01(k));
    api.cam.y = -115;
    api.cam.zoom = 1.85;
    api.addBanner('CALIBRATION 01', 'Turn + Grounded IK Walk');
    api.addCaption('Character turns right, walks with upright knees, and stops in front of chair');
  }
});

// Shot 1 (6.0s): Natural sit-down with planted feet -> reach & grab cup -> sip -> place down
K2D.shot({
  dur: 6.0,
  draw(api, t) {
    drawRoomSet(api, 0);

    const chair = new K2D.Chair({ x: CHAIR_X, facing: 1 });
    const table = new K2D.Table({ x: TABLE_X, width: 112, height: 82 });
    const cup = new K2D.CupProp({ ...table.surface(0, -16) });
    chair.pushToQueue(api.queue, 100, 0);
    table.pushToQueue(api.queue, 115, 0);

    const king = new K2D.Character({
      name: 'King', shirt: '#5b349a', pants: '#2c2538', hair: '#d8d4cf',
      hat: 'crown', beard: true, sash: '#eab839'
    });
    const advisor = new K2D.Character({
      name: 'Advisor', shirt: '#2b6cb0', pants: '#233142', hair: '#4a2f21'
    });

    // 0.0 -> 0.9s: Sit down from exact STAND_ENTRY_X with feet staying planted!
    king.resetPose(STAND_ENTRY_X, 0, 0.74);
    king.sitDown(t, 0.05, 0.85, STAND_ENTRY_X, chair, 0);

    const cupGrip = cup.gripPoint();
    const skPre = king.getSkeleton();
    const mouthSip = { x: skPre.mouthPos.x + 2, y: skPre.mouthPos.y + 6 };
    const restHand = { x: skPre.shR.x + 6, y: skPre.shR.y + 62 };

    if (t < 1.15) {
      cup.pushToQueue(api.queue, 118);
    } else if (t < 1.85) {
      const p = K2D.ramp(t, 1.15, 0.65);
      king.handRTarget = { x: K2D.lerp(restHand.x, cupGrip.x, p), y: K2D.lerp(restHand.y, cupGrip.y, p) };
      cup.pushToQueue(api.queue, 118);
    } else if (t < 2.65) {
      const p = K2D.ramp(t, 1.85, 0.75);
      king.attachedProps.R = cup;
      king.handRTarget = { x: K2D.lerp(cupGrip.x, mouthSip.x, p), y: K2D.lerp(cupGrip.y, mouthSip.y, p), tilt: K2D.lerp(0, -0.42, p) };
      king.headTilt = K2D.lerp(0, -0.14, p);
    } else if (t < 3.85) {
      king.attachedProps.R = cup;
      king.handRTarget = { x: mouthSip.x, y: mouthSip.y, tilt: -0.52 };
      king.headTilt = -0.16;
      king.mood = 'sip';
    } else if (t < 4.65) {
      const p = K2D.ramp(t, 3.85, 0.75);
      king.attachedProps.R = cup;
      king.handRTarget = { x: K2D.lerp(mouthSip.x, cupGrip.x, p), y: K2D.lerp(mouthSip.y, cupGrip.y, p), tilt: K2D.lerp(-0.52, 0, p) };
      king.headTilt = K2D.lerp(-0.16, 0, p);
      king.mood = 'happy';
    } else if (t < 5.35) {
      const p = K2D.ramp(t, 4.65, 0.65);
      cup.pushToQueue(api.queue, 118);
      king.handRTarget = { x: K2D.lerp(cupGrip.x, restHand.x, p), y: K2D.lerp(cupGrip.y, restHand.y, p) };
      king.mood = 'happy';
    } else {
      cup.pushToQueue(api.queue, 118);
      king.mood = 'happy';
    }

    if (t >= 4.65) king.gaze = { x: 285, y: -155 };
    king.autoBlink(t, 3.0, 0.2);
    king.autoBreathe(t, 1.4);
    king.pushToQueue(api.queue, 100, 0);

    advisor.resetPose(285, 0, -0.78);
    advisor.autoBreathe(t);
    advisor.autoBlink(t, 3.4, 0.9);
    advisor.gaze = { x: king.hips.x + 12, y: king.hips.y - 95 };
    if (t > 4.2 && t < 5.6) {
      advisor.headTilt = Math.sin((t - 4.2) * 8) * 0.1;
      advisor.mood = 'happy';
    }
    advisor.pushToQueue(api.queue, 100, 0);

    api.cam.x = 145;
    api.cam.y = -112;
    api.cam.zoom = K2D.lerp(1.85, 2.02, K2D.ramp(t, 1.5, 2.0));
    api.addBanner('CALIBRATION 02', 'Planted Sit-Down + Cup Drink');
    api.addCaption('Feet stay planted as hips lower onto chair, then cup rim reaches mouth cleanly');
  }
});