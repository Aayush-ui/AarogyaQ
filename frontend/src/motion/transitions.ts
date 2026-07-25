/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const springSoft = {
  type: "spring" as const,
  stiffness: 260,
  damping: 24,
};

export const springSnappy = {
  type: "spring" as const,
  stiffness: 400,
  damping: 30,
};

export const easeStandard = {
  type: "tween" as const,
  ease: [0.4, 0, 0.2, 1],
  duration: 0.25,
};

export const easeEmphasized = {
  type: "tween" as const,
  ease: [0.2, 0, 0, 1],
  duration: 0.4,
};
