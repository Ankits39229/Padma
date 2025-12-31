const si = require('systeminformation');
const fs = require('fs');
const path = require('path');
const os = require('os');
const PDFDocument = require('pdfkit');
const { dialog } = require('electron');

async function getSystemInfo() {
  try {
    const [cpu, mem, memLayout, osInfo, system, bios, baseboard, graphics, diskLayout, networkInterfaces, battery] = await Promise.all([
      si.cpu(),
      si.mem(),
      si.memLayout(),
      si.osInfo(),
      si.system(),
      si.bios(),
      si.baseboard(),
      si.graphics(),
      si.diskLayout(),
      si.networkInterfaces(),
      si.battery()
    ]);

    // Get Windows Defender status
    const defenderStatus = await getDefenderStatus();
    const firewallStatus = await getFirewallStatus();

    const systemInfo = {
      generatedAt: new Date().toISOString(),
      system: {
        manufacturer: system.manufacturer,
        model: system.model,
        serial: system.serial,
        uuid: system.uuid
      },
      bios: {
        vendor: bios.vendor,
        version: bios.version,
        releaseDate: bios.releaseDate
      },
      baseboard: {
        manufacturer: baseboard.manufacturer,
        model: baseboard.model,
        serial: baseboard.serial
      },
      os: {
        platform: osInfo.platform,
        distro: osInfo.distro,
        release: osInfo.release,
        build: osInfo.build,
        arch: osInfo.arch,
        hostname: osInfo.hostname,
        serial: osInfo.serial
      },
      cpu: {
        manufacturer: cpu.manufacturer,
        brand: cpu.brand,
        speed: `${cpu.speed} GHz`,
        speedMin: `${cpu.speedMin} GHz`,
        speedMax: `${cpu.speedMax} GHz`,
        cores: cpu.cores,
        physicalCores: cpu.physicalCores,
        processors: cpu.processors,
        socket: cpu.socket,
        cache: {
          l1d: cpu.cache.l1d,
          l1i: cpu.cache.l1i,
          l2: cpu.cache.l2,
          l3: cpu.cache.l3
        }
      },
      memory: {
        total: formatBytes(mem.total),
        free: formatBytes(mem.free),
        used: formatBytes(mem.used),
        available: formatBytes(mem.available),
        usagePercent: ((mem.used / mem.total) * 100).toFixed(1) + '%',
        swapTotal: formatBytes(mem.swaptotal),
        swapUsed: formatBytes(mem.swapused),
        modules: memLayout.map(m => ({
          size: formatBytes(m.size),
          type: m.type,
          clockSpeed: m.clockSpeed ? `${m.clockSpeed} MHz` : 'N/A',
          formFactor: m.formFactor,
          manufacturer: m.manufacturer,
          partNum: m.partNum,
          bank: m.bank
        }))
      },
      graphics: graphics.controllers.map(g => ({
        vendor: g.vendor,
        model: g.model,
        vram: g.vram ? `${g.vram} MB` : 'N/A',
        driver: g.driverVersion
      })),
      storage: diskLayout.map(d => ({
        name: d.name,
        type: d.type,
        size: formatBytes(d.size),
        vendor: d.vendor,
        interfaceType: d.interfaceType,
        serialNum: d.serialNum
      })),
      network: networkInterfaces.filter(n => !n.internal).map(n => ({
        iface: n.iface,
        type: n.type,
        mac: n.mac,
        ip4: n.ip4,
        ip6: n.ip6,
        speed: n.speed ? `${n.speed} Mbps` : 'N/A'
      })),
      battery: battery.hasBattery ? {
        hasBattery: true,
        cycleCount: battery.cycleCount,
        isCharging: battery.isCharging,
        percent: battery.percent,
        maxCapacity: battery.maxCapacity,
        currentCapacity: battery.currentCapacity,
        manufacturer: battery.manufacturer,
        model: battery.model
      } : { hasBattery: false },
      security: {
        windowsDefender: defenderStatus,
        firewall: firewallStatus
      }
    };

    return systemInfo;
  } catch (error) {
    console.error('Error getting system info:', error);
    throw error;
  }
}

async function getDefenderStatus() {
  return new Promise((resolve) => {
    const { exec } = require('child_process');
    exec('powershell -command "Get-MpComputerStatus | Select-Object -Property AntivirusEnabled,RealTimeProtectionEnabled,AntivirusSignatureLastUpdated | ConvertTo-Json"', 
      { timeout: 10000 },
      (error, stdout) => {
        if (error) {
          resolve({ enabled: 'Unknown', error: error.message });
          return;
        }
        try {
          const status = JSON.parse(stdout);
          resolve({
            antivirusEnabled: status.AntivirusEnabled,
            realTimeProtection: status.RealTimeProtectionEnabled,
            lastSignatureUpdate: status.AntivirusSignatureLastUpdated
          });
        } catch (e) {
          resolve({ enabled: 'Unknown', parseError: e.message });
        }
      }
    );
  });
}

async function getFirewallStatus() {
  return new Promise((resolve) => {
    const { exec } = require('child_process');
    exec('powershell -command "Get-NetFirewallProfile | Select-Object -Property Name,Enabled | ConvertTo-Json"',
      { timeout: 10000 },
      (error, stdout) => {
        if (error) {
          resolve({ status: 'Unknown', error: error.message });
          return;
        }
        try {
          const profiles = JSON.parse(stdout);
          const result = {};
          (Array.isArray(profiles) ? profiles : [profiles]).forEach(p => {
            result[p.Name] = p.Enabled;
          });
          resolve(result);
        } catch (e) {
          resolve({ status: 'Unknown', parseError: e.message });
        }
      }
    );
  });
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function exportToJSON(systemInfo, mainWindow) {
  const { filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Export System Info as JSON',
    defaultPath: path.join(os.homedir(), 'Desktop', `system-info-${Date.now()}.json`),
    filters: [{ name: 'JSON Files', extensions: ['json'] }]
  });

  if (filePath) {
    fs.writeFileSync(filePath, JSON.stringify(systemInfo, null, 2));
    return { success: true, path: filePath };
  }
  return { success: false, cancelled: true };
}

async function exportToText(systemInfo, mainWindow) {
  const { filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Export System Info as Text',
    defaultPath: path.join(os.homedir(), 'Desktop', `system-info-${Date.now()}.txt`),
    filters: [{ name: 'Text Files', extensions: ['txt'] }]
  });

  if (filePath) {
    const text = generateTextReport(systemInfo);
    fs.writeFileSync(filePath, text);
    return { success: true, path: filePath };
  }
  return { success: false, cancelled: true };
}

async function exportToPDF(systemInfo, mainWindow) {
  const { filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Export System Info as PDF',
    defaultPath: path.join(os.homedir(), 'Desktop', `system-info-${Date.now()}.pdf`),
    filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
  });

  if (filePath) {
    return new Promise((resolve) => {
      const doc = new PDFDocument({ margin: 50 });
      const stream = fs.createWriteStream(filePath);
      
      doc.pipe(stream);

      // Title
      doc.fontSize(24).fillColor('#1f2937').text('System Information Report', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#6b7280').text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
      doc.moveDown(1.5);

      // System Section
      addSection(doc, 'System', [
        ['Manufacturer', systemInfo.system.manufacturer],
        ['Model', systemInfo.system.model],
        ['Serial', systemInfo.system.serial]
      ]);

      // OS Section
      addSection(doc, 'Operating System', [
        ['OS', systemInfo.os.distro],
        ['Version', systemInfo.os.release],
        ['Build', systemInfo.os.build],
        ['Architecture', systemInfo.os.arch],
        ['Hostname', systemInfo.os.hostname]
      ]);

      // CPU Section
      addSection(doc, 'Processor', [
        ['CPU', `${systemInfo.cpu.manufacturer} ${systemInfo.cpu.brand}`],
        ['Speed', systemInfo.cpu.speed],
        ['Cores', `${systemInfo.cpu.physicalCores} Physical / ${systemInfo.cpu.cores} Logical`],
        ['Socket', systemInfo.cpu.socket]
      ]);

      // Memory Section
      doc.addPage();
      addSection(doc, 'Memory', [
        ['Total', systemInfo.memory.total],
        ['Used', systemInfo.memory.used],
        ['Available', systemInfo.memory.available],
        ['Usage', systemInfo.memory.usagePercent]
      ]);

      if (systemInfo.memory.modules.length > 0) {
        doc.moveDown(0.5);
        doc.fontSize(11).fillColor('#374151').text('Memory Modules:');
        systemInfo.memory.modules.forEach((m, i) => {
          doc.fontSize(9).fillColor('#6b7280').text(`  Slot ${i + 1}: ${m.size} ${m.type} @ ${m.clockSpeed}`);
        });
      }

      // Graphics Section
      addSection(doc, 'Graphics', systemInfo.graphics.map((g, i) => [
        `GPU ${i + 1}`, `${g.vendor} ${g.model} (${g.vram})`
      ]));

      // Storage Section
      addSection(doc, 'Storage', systemInfo.storage.map((d, i) => [
        `Drive ${i + 1}`, `${d.name} - ${d.size} (${d.type})`
      ]));

      // Security Section
      doc.addPage();
      addSection(doc, 'Security Status', [
        ['Windows Defender', systemInfo.security.windowsDefender.antivirusEnabled ? 'Enabled' : 'Disabled'],
        ['Real-time Protection', systemInfo.security.windowsDefender.realTimeProtection ? 'Enabled' : 'Disabled'],
        ['Domain Firewall', systemInfo.security.firewall.Domain ? 'Enabled' : 'Disabled'],
        ['Private Firewall', systemInfo.security.firewall.Private ? 'Enabled' : 'Disabled'],
        ['Public Firewall', systemInfo.security.firewall.Public ? 'Enabled' : 'Disabled']
      ]);

      // Footer
      doc.fontSize(8).fillColor('#9ca3af').text('Generated by Padma App', 50, doc.page.height - 50);

      doc.end();

      stream.on('finish', () => {
        resolve({ success: true, path: filePath });
      });

      stream.on('error', (err) => {
        resolve({ success: false, error: err.message });
      });
    });
  }
  return { success: false, cancelled: true };
}

function addSection(doc, title, items) {
  doc.fontSize(14).fillColor('#1f2937').text(title);
  doc.moveDown(0.3);
  doc.strokeColor('#e5e7eb').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
  doc.moveDown(0.5);

  items.forEach(([label, value]) => {
    doc.fontSize(10).fillColor('#6b7280').text(label + ': ', { continued: true });
    doc.fillColor('#1f2937').text(value || 'N/A');
  });

  doc.moveDown(1);
}

function generateTextReport(info) {
  let text = '═══════════════════════════════════════════════════════════════\n';
  text += '                    SYSTEM INFORMATION REPORT\n';
  text += `                    Generated: ${new Date().toLocaleString()}\n`;
  text += '═══════════════════════════════════════════════════════════════\n\n';

  text += '▸ SYSTEM\n';
  text += `  Manufacturer: ${info.system.manufacturer}\n`;
  text += `  Model: ${info.system.model}\n`;
  text += `  Serial: ${info.system.serial}\n\n`;

  text += '▸ OPERATING SYSTEM\n';
  text += `  OS: ${info.os.distro}\n`;
  text += `  Version: ${info.os.release}\n`;
  text += `  Build: ${info.os.build}\n`;
  text += `  Architecture: ${info.os.arch}\n`;
  text += `  Hostname: ${info.os.hostname}\n\n`;

  text += '▸ PROCESSOR\n';
  text += `  CPU: ${info.cpu.manufacturer} ${info.cpu.brand}\n`;
  text += `  Speed: ${info.cpu.speed}\n`;
  text += `  Cores: ${info.cpu.physicalCores} Physical / ${info.cpu.cores} Logical\n`;
  text += `  Socket: ${info.cpu.socket}\n\n`;

  text += '▸ MEMORY\n';
  text += `  Total: ${info.memory.total}\n`;
  text += `  Used: ${info.memory.used}\n`;
  text += `  Available: ${info.memory.available}\n`;
  text += `  Usage: ${info.memory.usagePercent}\n`;
  info.memory.modules.forEach((m, i) => {
    text += `  Module ${i + 1}: ${m.size} ${m.type} @ ${m.clockSpeed}\n`;
  });
  text += '\n';

  text += '▸ GRAPHICS\n';
  info.graphics.forEach((g, i) => {
    text += `  GPU ${i + 1}: ${g.vendor} ${g.model} (${g.vram})\n`;
  });
  text += '\n';

  text += '▸ STORAGE\n';
  info.storage.forEach((d, i) => {
    text += `  Drive ${i + 1}: ${d.name} - ${d.size} (${d.type})\n`;
  });
  text += '\n';

  text += '▸ SECURITY\n';
  text += `  Windows Defender: ${info.security.windowsDefender.antivirusEnabled ? 'Enabled' : 'Disabled'}\n`;
  text += `  Real-time Protection: ${info.security.windowsDefender.realTimeProtection ? 'Enabled' : 'Disabled'}\n`;
  text += `  Domain Firewall: ${info.security.firewall.Domain ? 'Enabled' : 'Disabled'}\n`;
  text += `  Private Firewall: ${info.security.firewall.Private ? 'Enabled' : 'Disabled'}\n`;
  text += `  Public Firewall: ${info.security.firewall.Public ? 'Enabled' : 'Disabled'}\n\n`;

  text += '═══════════════════════════════════════════════════════════════\n';
  text += '                    End of Report\n';
  text += '═══════════════════════════════════════════════════════════════\n';

  return text;
}

module.exports = {
  getSystemInfo,
  exportToJSON,
  exportToText,
  exportToPDF
};
