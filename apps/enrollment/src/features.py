"""
@file apps/enrollment/src/features.py
@description Canonical feature definitions matching the TypeScript contracts and Appendix B feature groups.

WHY THIS EXISTS:
Guarantees identical feature ordering between the Python machine learning toolchain,
the ESP32 C firmware header, the Gateway API, and the Web App.
"""

CANONICAL_FEATURE_NAMES = [
    "t_total",
    "t_p1",
    "t_p2",
    "t_p3",
    "t_lag_force_gyro",
    "t_time_to_peak_force",
    "f_peak",
    "f_mean",
    "f_impulse",
    "f_rfd",
    "w_peak",
    "w_excursion",
    "a_rms",
    "a_peak_jerk",
    "corr_force_gyro",
    "phase_overlap_ratio"
]

FEATURE_GROUPS = {
    "timing": ["t_total", "t_p1", "t_p2", "t_p3", "t_lag_force_gyro", "t_time_to_peak_force"],
    "force": ["f_peak", "f_mean", "f_impulse", "f_rfd"],
    "motion": ["w_peak", "w_excursion", "a_rms", "a_peak_jerk"],
    "cross_channel": ["corr_force_gyro", "phase_overlap_ratio"]
}
