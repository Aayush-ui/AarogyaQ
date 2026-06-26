import streamlit as st
from frontend.components.api_client import check_health

st.set_page_config(page_title="AarogyaQ", layout="wide")

st.markdown("<h1 style='color: #1B6CA8;'>AarogyaQ</h1>", unsafe_allow_html=True)
st.markdown("<em>Right Care. Right Time. Right Patient.</em>", unsafe_allow_html=True)

st.sidebar.success("Navigation")

if not check_health():
    st.error("Backend not reachable. Start the FastAPI server.")
else:
    st.success("Backend connected successfully.")

st.info("Please select a page from the sidebar to continue.")
