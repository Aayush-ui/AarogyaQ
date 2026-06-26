import streamlit as st
from datetime import datetime, date, time, timedelta
from frontend.components.api_client import get_shift_report
import pandas as pd

st.set_page_config(page_title="AarogyaQ - Shift Summary", layout="wide")
st.title("Shift Summary Report")
st.caption("End-of-shift statistics for handover documentation.")

# Initialize session state for presets
today = date.today()
if "start_d" not in st.session_state: st.session_state.start_d = today
if "start_t" not in st.session_state: st.session_state.start_t = time(6, 0)
if "end_d" not in st.session_state: st.session_state.end_d = today
if "end_t" not in st.session_state: st.session_state.end_t = time(14, 0)

def set_preset(preset):
    t = date.today()
    if preset == "1":
        st.session_state.start_d = t
        st.session_state.start_t = time(6, 0)
        st.session_state.end_d = t
        st.session_state.end_t = time(14, 0)
    elif preset == "2":
        st.session_state.start_d = t
        st.session_state.start_t = time(14, 0)
        st.session_state.end_d = t
        st.session_state.end_t = time(22, 0)
    elif preset == "3":
        st.session_state.start_d = t
        st.session_state.start_t = time(22, 0)
        st.session_state.end_d = t + timedelta(days=1)
        st.session_state.end_t = time(6, 0)

st.markdown("**Quick Presets**")
pc1, pc2, pc3 = st.columns(3)
with pc1:
    st.button("Today 6AM-2PM", on_click=set_preset, args=("1",), use_container_width=True)
with pc2:
    st.button("Today 2PM-10PM", on_click=set_preset, args=("2",), use_container_width=True)
with pc3:
    st.button("Today 10PM-6AM", on_click=set_preset, args=("3",), use_container_width=True)

with st.container(border=True):
    col1, col2 = st.columns(2)
    with col1:
        st.markdown("**Shift Start**")
        sd = st.date_input("Start Date", key="start_d", label_visibility="collapsed")
        st_time = st.time_input("Start Time", key="start_t", label_visibility="collapsed")
    with col2:
        st.markdown("**Shift End**")
        ed = st.date_input("End Date", key="end_d", label_visibility="collapsed")
        et_time = st.time_input("End Time", key="end_t", label_visibility="collapsed")
        
    generate = st.button("Generate Report", type="primary")

if generate:
    start_dt = datetime.combine(st.session_state.start_d, st.session_state.start_t)
    end_dt = datetime.combine(st.session_state.end_d, st.session_state.end_t)
    
    with st.spinner("Compiling shift report..."):
        try:
            report = get_shift_report(start_dt.isoformat(), end_dt.isoformat())
            
            st.markdown("---")
            r1c1, r1c2, r1c3 = st.columns(3)
            r1c1.metric("Total Patients", report.get("total_patients", 0))
            r1c2.metric("Patients Completed", report.get("patients_completed", 0))
            r1c3.metric("Stale Alert Count", report.get("stale_alert_count", 0))
            
            st.subheader("By Priority")
            r2c1, r2c2, r2c3, r2c4 = st.columns(4)
            bp = report.get("by_priority", {})
            r2c1.metric("Critical", bp.get("Critical", 0))
            r2c2.metric("High", bp.get("High", 0))
            r2c3.metric("Medium", bp.get("Medium", 0))
            r2c4.metric("Low", bp.get("Low", 0))
            
            st.subheader("Wait Time")
            r3c1, r3c2, r3c3 = st.columns(3)
            avg_w = report.get("avg_wait_time_minutes")
            long_w = report.get("longest_wait_minutes")
            
            r3c1.metric("Average Wait (min)", f"{avg_w:.1f}" if avg_w is not None else "N/A")
            r3c2.metric("Longest Wait (min)", f"{long_w:.1f}" if long_w is not None else "N/A")
            
            st.markdown("---")
            c_chart, c_queue = st.columns([2, 1])
            with c_chart:
                st.subheader("Priority Distribution")
                df = pd.DataFrame({
                    "Priority": ["Critical", "High", "Medium", "Low"],
                    "Count": [bp.get("Critical", 0), bp.get("High", 0), bp.get("Medium", 0), bp.get("Low", 0)]
                })
                # Set index to Priority so bar_chart labels correctly
                df = df.set_index("Priority")
                st.bar_chart(df)
                
            with c_queue:
                st.subheader("Queue Split")
                bq = report.get("by_queue", {})
                st.metric("Emergency Queue", bq.get("Emergency", 0))
                st.metric("General OPD Queue", bq.get("General", 0))
                
            st.info(f"Report covers **{report.get('total_patients', 0)}** patient(s) between **{report.get('shift_start')}** and **{report.get('shift_end')}**.")
            
        except RuntimeError as e:
            st.error(f"Failed to generate report: {e}")
