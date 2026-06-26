import streamlit as st
from datetime import datetime
# pyrefly: ignore [missing-import]
from streamlit_autorefresh import st_autorefresh
from frontend.components.api_client import (
    get_emergency_queue,
    get_general_queue,
    get_stale_patients,
    get_departments,
    update_department_status
)
from frontend.components.queue_card import show_queue_card

st.set_page_config(page_title="AarogyaQ - Live Dashboard", layout="wide")
st.title("Live Queue Dashboard")

auto_ref = st.toggle("Auto-refresh every 30s", key="auto_refresh")
if auto_ref:
    st_autorefresh(interval=30000, key="data_refresh")

try:
    eq = get_emergency_queue()
    gq = get_general_queue()
    stale = get_stale_patients()
    depts = get_departments()
except RuntimeError as e:
    st.error(f"Error fetching data from API: {e}")
    st.stop()

st.markdown("---")

total_waiting = len(eq) + len(gq)
crit_high = len(eq)
med_low = len(gq)
stale_count = len(stale)

c1, c2, c3, c4 = st.columns(4)
c1.metric("Total Waiting", total_waiting)
c2.metric("Critical + High (Emergency)", crit_high)
c3.metric("Medium + Low (General)", med_low)
c4.metric("Stale Alerts", stale_count)

if stale_count > 0:
    st.warning(f"⚠️ {stale_count} patient(s) waiting over 45 minutes in General Queue. Please attend.")
    for v in stale:
        p = v.get("patient", {})
        vt = v.get("visit", {}).get("visit_timestamp", "")
        if vt:
            if not vt.endswith("Z"): vt += "Z"
            dt = datetime.fromisoformat(vt.replace("Z", "+00:00")).replace(tzinfo=None)
            mins = int((datetime.utcnow() - dt).total_seconds() / 60)
            st.write(f"- **{p.get('name')}** (Wait: {mins} min)")

st.markdown("---")

col_eq, col_gq = st.columns(2)

with col_eq:
    st.subheader("🚨 Emergency Queue")
    if not eq:
        st.info("No patients in Emergency Queue.")
    for visit in eq:
        show_queue_card(visit)

with col_gq:
    st.subheader("🩺 General OPD Queue")
    if not gq:
        st.info("No patients in General Queue.")
    stale_ids = {v.get("visit", {}).get("visit_id") for v in stale}
    for visit in gq:
        vid = visit.get("visit", {}).get("visit_id")
        if vid in stale_ids:
            # Highlight with yellow background container
            st.markdown(f"<div style='border: 2px solid #FFD54F; border-radius: 8px; padding: 4px; background-color: #FFFDE7; margin-bottom: 10px;'>", unsafe_allow_html=True)
            show_queue_card(visit)
            st.markdown("</div>", unsafe_allow_html=True)
        else:
            show_queue_card(visit)

st.markdown("---")
st.subheader("Departments")
dept_cols = st.columns(4)

for i, d in enumerate(depts):
    col = dept_cols[i % 4]
    name = d.get("name")
    status = d.get("status")
    
    color_map = {"Available": "green", "Busy": "orange", "Full": "red"}
    color = color_map.get(status, "grey")
    
    with col:
        with st.container(border=True):
            st.markdown(f"**{name}**")
            st.markdown(f"<span style='color: white; background-color: {color}; padding: 2px 6px; border-radius: 4px; font-size: 12px;'>{status}</span>", unsafe_allow_html=True)
            new_status = st.selectbox("Update Status", ["Available", "Busy", "Full"], index=["Available", "Busy", "Full"].index(status), key=f"dept_{name}")
            if new_status != status:
                update_department_status(name, new_status)
                st.rerun()
