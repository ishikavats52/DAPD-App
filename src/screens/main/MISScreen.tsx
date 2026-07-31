import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, Dimensions } from 'react-native';
import { Text, Appbar, useTheme, ActivityIndicator, Card } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../navigation/MainTabNavigator';
import { COLORS } from '../../theme';
import apiClient from '../../api/client';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';

type Props = {
  navigation: NativeStackNavigationProp<MainStackParamList, 'MISReport'>;
};

type ReferenceDocument = {
  dateOfSO: string;
  description: string;
  qty: string;
  rate: string;
  amount: string;
};

type MISReportData = {
  unit: string;
  qty: string;
  purpose: string;
  basedOnDataText: string;
  highRate: string;
  highItemTotal: string;
  mediumRate: string;
  mediumItemTotal: string;
  recommended: string;
  suggestedSuppliers: string[];
  referenceDocuments: ReferenceDocument[];
  openMarket: string;
};

const GOLD = '#F3B718';

const MISScreen = ({ navigation }: Props) => {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [selectedOrg, setSelectedOrg] = useState('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<MISReportData | null>(null);

  const orgs = ['All', 'R&R', 'Dental Centre', 'Bure Hospital'];

  const handleGenerateReport = async () => {
    if (!query.trim()) {
      Alert.alert('Required', 'Please enter an article name or topic to analyze.');
      return;
    }

    setLoading(true);
    setReport(null);

    try {
      const response = await apiClient.post('/medicines/generate-mis', {
        query: query.trim(),
        organisation: selectedOrg === 'All' ? '' : selectedOrg,
      });

      if (response.data && response.data.report) {
        setReport(response.data.report);
      } else {
        throw new Error('No report data returned');
      }
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.message || error.message || 'Failed to generate report';
      Alert.alert('Generation Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!report) return;

    try {
      const htmlContent = `
        <html>
          <head>
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 30px; color: #333; font-size: 14px; line-height: 1.6; }
              .header { text-align: center; border-bottom: 2px solid #172B4D; padding-bottom: 20px; margin-bottom: 20px; }
              .emblem { height: 80px; margin-bottom: 10px; }
              .title { font-size: 24px; font-weight: bold; color: #172B4D; margin: 0; }
              .subtitle { font-size: 14px; color: #666; margin-top: 5px; }
              .meta { font-size: 12px; color: #999; margin-top: 5px; }
              .estimate-title { font-size: 20px; font-weight: bold; color: #172B4D; text-decoration: underline; margin-bottom: 20px; }
              .info-row { margin-bottom: 10px; }
              .info-label { font-weight: bold; width: 80px; display: inline-block; }
              .text-box { margin-bottom: 20px; }
              table { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 20px; }
              th, td { border: 1px solid #DFE1E6; padding: 10px; text-align: left; font-size: 13px; }
              th { background-color: #172B4D; color: #FFF; font-weight: bold; }
              tr:nth-child(even) { background-color: #F8F9FA; }
              .footer { text-align: center; font-size: 11px; color: #999; margin-top: 40px; border-top: 1px solid #DFE1E6; padding-top: 10px; }
            </style>
          </head>
          <body>
            <div class="header">
              <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Emblem_of_India.svg/250px-Emblem_of_India.svg.png" class="emblem" />
              <div class="title">DEFENCE ARTICLES PRICING DEPOSITORY</div>
              <div class="subtitle">Management Information System (MIS)</div>
              <div class="meta">Generated on ${new Date().toLocaleDateString()} | Topic: "${query}"</div>
            </div>
            
            <div class="estimate-title">Estimate:</div>
            
            <div class="info-row"><span class="info-label">1. Unit:</span> ${report.unit || 'N/A'}</div>
            <div class="info-row"><span class="info-label">2. Qty:</span> ${report.qty || 'N/A'}</div>
            <div class="info-row"><span class="info-label">3. Purpose:</span> ${report.purpose || 'N/A'}</div>
            
            <div class="text-box">
              <strong>4.</strong> ${report.basedOnDataText}
              <br/><br/>
              1) <strong>High:</strong> ${report.highRate} / Item Total: ${report.highItemTotal}<br/>
              2) <strong>Medium:</strong> ${report.mediumRate} / ${report.mediumItemTotal}
            </div>
            
            <div class="text-box">
              <strong>5. Recommended:</strong> ${report.recommended}
            </div>
            
            <div class="text-box">
              <strong>6. Reference documents</strong>
              <table>
                <thead>
                  <tr>
                    <th>S.No</th>
                    <th>Date of SO</th>
                    <th>Description/Brand/Supplier</th>
                    <th>Qty</th>
                    <th>Rate</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${report.referenceDocuments.map((item, idx) => `
                    <tr>
                      <td>${idx + 1}</td>
                      <td>${item.dateOfSO}</td>
                      <td>${item.description}</td>
                      <td>${item.qty}</td>
                      <td>${item.rate}</td>
                      <td>${item.amount}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            
            <div class="text-box">
              <strong>7. Open market:</strong> ${report.openMarket}
            </div>
            
            <div class="text-box">
              <strong>8. Suggested Suppliers:</strong> ${report.suggestedSuppliers ? report.suggestedSuppliers.join(', ') : 'None listed'}
            </div>
            
            <div class="footer">
              CONFIDENTIAL - FOR DEFENCE ACQUISITION PURPOSES ONLY
            </div>
          </body>
        </html>
      `;

      const { base64 } = await Print.printToFileAsync({ html: htmlContent, base64: true });
      const newUri = `${FileSystem.documentDirectory}mis_report_${query.replace(/\s+/g, '_')}.pdf`;
      
      if (base64) {
        await FileSystem.writeAsStringAsync(newUri, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }
      
      await Sharing.shareAsync(newUri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', `Failed to generate PDF: ${error?.message || String(error)}`);
    }
  };

  return (
    <View style={styles.container}>
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="MIS Report Engine" />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionHeading}>Generate Analytics Report</Text>
            <Text style={styles.subtext}>
              Analyze procurement trends, benchmark prices, and auto-formulate Broad Band Quantitative Requirements (BBQRs).
            </Text>

            <Text style={styles.label}>Nomenclature / Keyword</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Microbiology Macconkey Agar, Syringes"
              value={query}
              onChangeText={setQuery}
              placeholderTextColor="#888"
            />

            <Text style={styles.label}>Filter by Organization (Optional)</Text>
            <View style={styles.orgContainer}>
              {orgs.map((org) => (
                <TouchableOpacity
                  key={org}
                  style={[
                    styles.orgChip,
                    (selectedOrg === org || (org === 'All' && !selectedOrg)) && styles.orgChipActive
                  ]}
                  onPress={() => setSelectedOrg(org === 'All' ? '' : org)}
                >
                  <Text
                    style={[
                      styles.orgChipText,
                      (selectedOrg === org || (org === 'All' && !selectedOrg)) && styles.orgChipTextActive
                    ]}
                  >
                    {org}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.generateButton} onPress={handleGenerateReport} disabled={loading}>
              <Text style={styles.generateButtonText}>Compile MIS Report</Text>
            </TouchableOpacity>
          </Card.Content>
        </Card>

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>AI is compiling procurement database...</Text>
            <Text style={styles.loadingSubtext}>Formulating Broad Band Quantitative Requirements (BBQRs)...</Text>
          </View>
        )}

        {report && (
          <Card style={[styles.card, { marginTop: 16, backgroundColor: '#FFF' }]}>
            <Card.Content>
              <View style={styles.reportHeader}>
                <Ionicons name="document-text" size={24} color={COLORS.primary} />
                <Text style={styles.reportTitle}>Generated Intelligence Report</Text>
              </View>

              <Text style={styles.reportSectionTitle}>Estimate</Text>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>1. Unit:</Text>
                <Text style={styles.infoValue}>{report.unit || 'N/A'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>2. Qty:</Text>
                <Text style={styles.infoValue}>{report.qty || 'N/A'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>3. Purpose:</Text>
                <Text style={styles.infoValue}>{report.purpose || 'N/A'}</Text>
              </View>
              
              <View style={[styles.summaryBox, { marginTop: 12 }]}>
                <Text style={styles.summaryText}>
                  <Text style={{ fontWeight: 'bold' }}>4. </Text>{report.basedOnDataText}
                </Text>
                <View style={{ marginTop: 8 }}>
                  <Text style={styles.summaryText}>1) <Text style={{ fontWeight: 'bold' }}>High:</Text> {report.highRate} / Item Total: {report.highItemTotal}</Text>
                  <Text style={styles.summaryText}>2) <Text style={{ fontWeight: 'bold' }}>Medium:</Text> {report.mediumRate} / {report.mediumItemTotal}</Text>
                </View>
              </View>

              <View style={{ marginTop: 16, marginBottom: 16 }}>
                <Text style={styles.summaryText}>
                  <Text style={{ fontWeight: 'bold' }}>5. Recommended: </Text>{report.recommended}
                </Text>
              </View>

              <Text style={styles.reportSectionTitle}>6. Reference Documents</Text>
              {report.referenceDocuments.map((item, idx) => (
                <View key={idx} style={styles.tableRow}>
                  <Text style={styles.tableNomenclature}>{item.dateOfSO} - {item.description}</Text>
                  <View style={styles.tableRatesRow}>
                    <View style={styles.rateCol}>
                      <Text style={styles.rateLabel}>Qty</Text>
                      <Text style={styles.rateValue}>{item.qty}</Text>
                    </View>
                    <View style={styles.rateCol}>
                      <Text style={styles.rateLabel}>Rate</Text>
                      <Text style={styles.rateValue}>{item.rate}</Text>
                    </View>
                    <View style={styles.rateCol}>
                      <Text style={styles.rateLabel}>Amount</Text>
                      <Text style={[styles.rateValue, { color: '#27AE60' }]}>{item.amount}</Text>
                    </View>
                  </View>
                </View>
              ))}

              <View style={{ marginTop: 8, marginBottom: 8 }}>
                <Text style={styles.summaryText}>
                  <Text style={{ fontWeight: 'bold' }}>7. Open market: </Text>{report.openMarket}
                </Text>
              </View>

              <View style={{ marginBottom: 16 }}>
                <Text style={styles.summaryText}>
                  <Text style={{ fontWeight: 'bold' }}>8. Suggested Suppliers: </Text>
                  {report.suggestedSuppliers ? report.suggestedSuppliers.join(', ') : 'None listed'}
                </Text>
              </View>

              <TouchableOpacity style={styles.downloadButton} onPress={handleDownloadPDF}>
                <Ionicons name="download-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.downloadButtonText}>Export Report to PDF</Text>
              </TouchableOpacity>
            </Card.Content>
          </Card>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: COLORS.surface,
    elevation: 3,
    borderRadius: 8,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 6,
  },
  subtext: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 20,
    lineHeight: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 8,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    padding: 12,
    fontSize: 14,
    color: '#000',
    backgroundColor: '#FAFBFD',
    marginBottom: 16,
  },
  orgContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
  },
  orgChip: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#FFF',
  },
  orgChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  orgChipText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  orgChipTextActive: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  generateButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 6,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  generateButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  loadingContainer: {
    marginTop: 24,
    alignItems: 'center',
    padding: 16,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
    marginTop: 12,
  },
  loadingSubtext: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    paddingBottom: 12,
    marginBottom: 16,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginLeft: 8,
  },
  reportSectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
    textTransform: 'uppercase',
    marginTop: 16,
    marginBottom: 8,
  },
  summaryBox: {
    backgroundColor: '#F4F5F8',
    borderLeftWidth: 4,
    borderLeftColor: GOLD,
    padding: 12,
    borderRadius: 4,
  },
  summaryText: {
    fontSize: 13,
    color: '#333',
    lineHeight: 18,
  },
  tableRow: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#FAFBFD',
  },
  tableNomenclature: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 8,
  },
  tableRatesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  rateCol: {
    flex: 1,
  },
  rateLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  rateValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  bbqrLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  bbqrValue: {
    fontSize: 13,
    color: '#444',
    lineHeight: 17,
  },
  recommendationsText: {
    fontSize: 13,
    color: '#444',
    lineHeight: 18,
    marginBottom: 16,
  },
  downloadButton: {
    flexDirection: 'row',
    backgroundColor: '#27AE60',
    borderRadius: 6,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  infoLabel: {
    fontWeight: 'bold',
    width: 80,
    color: '#333',
    fontSize: 14,
  },
  infoValue: {
    flex: 1,
    color: '#333',
    fontSize: 14,
  },
});

export default MISScreen;
