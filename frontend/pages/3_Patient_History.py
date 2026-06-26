import streamlit as st
from datetime import datetime
from frontend.components.api_client import get_patient_history
from frontend.components.priority_badge import show_priority_badge

PRIORITY_COLORS = {
    "Critical": "#D32F2F",
    "High": "#F57C00",
    "Medium": "#F9A825",
    "Low": "#388E3C",
}

st.set_page_config(page_title="AarogyaQ - Patient History", layout="wide")
st.title("Patient History Lookup")
st.caption("Search by Patient ID (ARQ-XXXXXX) or phone number.")

with st.container(border=True):
    col1, col2 = st.columns([3, 1])
    with col1:
        search_query = st.text_input("Patient ID or Phone", placeholder="e.g. ARQ-123456")
    with col2:
        st.write("")
        st.write("")
        search_btn = st.button("Search", type="primary")
        
if search_btn and search_query.strip():
    query = search_query.strip()
    if query.startswith("ARQ-"):
        try:
            history = get_patient_history(query)
            if not history:
                st.info("No records found.")
            else:
                st.success(f"Found {len(history)} visit(s) for this patient.")
                for res in history:
                    v = res.get("visit", {})
                    a = res.get("assessment", {})
                    s = res.get("summary", {})
                    
                    v_id = v.get("visit_id")
                    v_time = v.get("visit_timestamp", "")[:10] if v.get("visit_timestamp") else "Unknown"
                    prio = a.get("priority_level", "Unknown")
                    
                    with st.expander(f"Visit {v_id} -- {v_time} -- Priority: {prio}", expanded=False):
                        # Layout inside expander
                        c1, c2 = st.columns([2, 1])
                        with c1:
                            st.markdown(f"**Chief Complaint:** {v.get('chief_complaint')}")
                            mapped = a.get("mapped_symptoms", [])
                            st.markdown(f"**Mapped Symptoms:** {', '.join(mapped) if mapped else 'None'}")
                            factors = a.get("contributing_factors", [])
                            st.markdown(f"**Contributing Factors:** {', '.join(factors) if factors else 'None'}")
                            st.markdown(f"**Department Assigned:** {v.get('department_assigned', 'N/A')}")
                            st.markdown(f"**Status:** {v.get('status', 'Unknown')}")
                            
                            # Wait time calculation
                            if v.get('status') == 'Completed' and v.get('attended_at') and v.get('visit_timestamp'):
                                vt_str = v.get('visit_timestamp')
                                at_str = v.get('attended_at')
                                if not vt_str.endswith("Z"): vt_str += "Z"
                                if not at_str.endswith("Z"): at_str += "Z"
                                vt_dt = datetime.fromisoformat(vt_str.replace("Z", "+00:00")).replace(tzinfo=None)
                                at_dt = datetime.fromisoformat(at_str.replace("Z", "+00:00")).replace(tzinfo=None)
                                mins = int((at_dt - vt_dt).total_seconds() / 60)
                                st.markdown(f"**Wait Time:** {mins} min")
                                
                            st.markdown("**Doctor Summary:**")
                            st.info(s.get("summary_text", "No summary available."))
                            
                        with c2:
                            st.markdown(f"**Risk Score:** {a.get('risk_score', 0)}")
                            show_priority_badge(prio, PRIORITY_COLORS.get(prio, "#888888"))
                            
        except RuntimeError as e:
            # The backend returns 422 if patient doesn't exist
            st.info("No records found or patient does not exist.")
    else:
        st.info("Phone search coming soon. Use Patient ID for now.")
