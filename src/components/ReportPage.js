import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DashboardHeader from './DashboardHeader';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import './ReportPage.css';

const ReportPage = () => {
  const { analysisId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (analysisId) {
      generateReport(analysisId);
    }
  }, [analysisId]);

  const generateReport = async (analysisId) => {
    setLoading(true);
    setError(null);

    try {
      // Step 1: Fetch complete analysis details
      const token = localStorage.getItem('access_token');
      const analysisResponse = await fetch(`http://localhost:8000/interview/analysis/${analysisId}/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!analysisResponse.ok) {
        throw new Error('Failed to fetch analysis details');
      }

      const fullAnalysisData = await analysisResponse.json();
      console.log('Full analysis data:', fullAnalysisData);

      // Step 2: Generate AI report using LLM endpoint
      const reportResponse = await fetch('http://localhost:8000/interview/generate-report/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(fullAnalysisData)
      });

      if (!reportResponse.ok) {
        throw new Error('Failed to generate AI report');
      }

      const generatedReport = await reportResponse.json();
      console.log('Generated report:', generatedReport);
      setReportData(generatedReport);

    } catch (error) {
      console.error('Error generating report:', error);
      setError(`Error generating report: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = async () => {
    if (!reportData) {
      alert('No report content available to download');
      return;
    }

    try {
      // Get the report content element
      const reportElement = document.querySelector('.report-content');
      if (!reportElement) {
        alert('Report content not found');
        return;
      }

      // Create canvas from the report content
      const canvas = await html2canvas(reportElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 295; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      // Add the first page
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add additional pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Save the PDF
      const fileName = `FluentUp-Analysis-Report-${analysisId}-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const goBack = () => {
    navigate('/history');
  };

  if (loading) {
    return (
      <>
        <DashboardHeader />
        <div className="report-page">
          <div className="report-container">
            <div className="loading-state">
              <div className="spinner"></div>
              <h2>🤖 Generating AI Report...</h2>
              <p>Please wait while we analyze your data and generate a comprehensive report.</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <DashboardHeader />
        <div className="report-page">
          <div className="report-container">
            <div className="error-state">
              <h2>⚠️ Error</h2>
              <p>{error}</p>
              <div className="error-actions">
                <button onClick={() => generateReport(analysisId)} className="retry-btn">
                  🔄 Retry
                </button>
                <button onClick={goBack} className="back-btn">
                  ← Back to History
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <DashboardHeader />
      <div className="report-page">
        <div className="report-container">
          <div className="report-actions">
            <button onClick={goBack} className="back-btn">
              ← Back to History
            </button>
            <button onClick={downloadReport} className="download-btn">
              💾 Download PDF
            </button>
          </div>

          <div className="report-content">
            {reportData ? (
              <div className="markdown-wrapper">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {reportData.report?.report_text || reportData.report_content || reportData.report_text || 'No report content available'}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="no-content">
                <p>No report data available</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ReportPage;
