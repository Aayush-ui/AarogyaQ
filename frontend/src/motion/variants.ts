/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Variants } from "motion/react";

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.15 },
  },
};

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 260, damping: 24 },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.15 },
  },
};

export const staggerContainer = (staggerChildren = 0.06, delayChildren = 0.05): Variants => ({
  hidden: {},
  visible: {
    transition: {
      staggerChildren,
      delayChildren,
    },
  },
});

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: "spring", stiffness: 300, damping: 25 },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.15 },
  },
};

export const slideInRight: Variants = {
  hidden: { x: "100%", opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 300, damping: 28 },
  },
  exit: {
    x: "100%",
    opacity: 0,
    transition: { duration: 0.2, ease: "easeInOut" },
  },
};

export const slideInLeft: Variants = {
  hidden: { x: "-100%", opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 300, damping: 28 },
  },
  exit: {
    x: "-100%",
    opacity: 0,
    transition: { duration: 0.2, ease: "easeInOut" },
  },
};

export const pulseGlow = (color = "rgba(211,47,47,0.45)", frequencySec = 1.6) => ({
  animate: {
    boxShadow: [
      `0 0 0 0px ${color}`,
      `0 0 16px 6px ${color}`,
      `0 0 0 0px ${color}`,
    ],
    scale: [1, 1.03, 1],
    transition: {
      duration: frequencySec,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
});

export const pulseGlowBorder = (color = "rgba(211,47,47,0.45)", frequencySec = 1.6) => ({
  animate: {
    borderColor: [
      `rgba(211, 47, 47, 0.2)`,
      `rgba(211, 47, 47, 0.8)`,
      `rgba(211, 47, 47, 0.2)`,
    ],
    boxShadow: [
      `0 0 0 0px ${color}`,
      `0 0 12px 2px ${color}`,
      `0 0 0 0px ${color}`,
    ],
    transition: {
      duration: frequencySec,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
});
