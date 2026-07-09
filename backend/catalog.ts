// ??$$$ Canonical Component Catalog for Velxio Simulator Mappings

export interface ComponentTypeMetadata {
  pins: string[];
  function: string;
  voltageTolerance: ('3.3V' | '5V')[];
  description?: string;
  tagName?: string;
}

export const componentCatalog: Record<string, ComponentTypeMetadata> = {
  // Microcontrollers
  'arduino-uno': {
    pins: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', 'A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'GND.1', 'GND.2', 'GND.3', '5V', '3.3V', 'RESET', 'VIN'],
    function: 'microcontroller',
    voltageTolerance: ['5V'],
    description: 'Arduino Uno - 5V logic board',
    tagName: 'wokwi-arduino-uno'
  },
  'arduino_uno': {
    pins: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', 'A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'GND.1', 'GND.2', 'GND.3', '5V', '3.3V', 'RESET', 'VIN'],
    function: 'microcontroller',
    voltageTolerance: ['5V'],
    description: 'Arduino Uno - 5V logic board',
    tagName: 'wokwi-arduino-uno'
  },
  'arduino-nano': {
    pins: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', 'A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'GND.1', 'GND.2', '5V', 'RESET', 'TX', 'RX', '3.3V', 'REF'],
    function: 'microcontroller',
    voltageTolerance: ['5V'],
    description: 'Arduino Nano - 5V logic board',
    tagName: 'wokwi-arduino-nano'
  },
  'arduino_nano': {
    pins: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', 'A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'GND.1', 'GND.2', '5V', 'RESET', 'TX', 'RX', '3.3V', 'REF'],
    function: 'microcontroller',
    voltageTolerance: ['5V'],
    description: 'Arduino Nano - 5V logic board',
    tagName: 'wokwi-arduino-nano'
  },
  'arduino-mega': {
    pins: [
      '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20',
      '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '32', '33', '34', '35', '36', '37', '38', '39', '40',
      '41', '42', '43', '44', '45', '46', '47', '48', '49', '50', '51', '52', '53',
      'A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'A10', 'A11', 'A12', 'A13', 'A14', 'A15',
      'GND.1', 'GND.2', 'GND.3', 'GND.4', 'GND.5', '5V.1', '5V.2', '5V.3', '3.3V', 'RESET', 'VIN'
    ],
    function: 'microcontroller',
    voltageTolerance: ['5V'],
    description: 'Arduino Mega 2560 - 5V logic board',
    tagName: 'wokwi-arduino-mega'
  },
  'arduino_mega': {
    pins: [
      '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20',
      '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '32', '33', '34', '35', '36', '37', '38', '39', '40',
      '41', '42', '43', '44', '45', '46', '47', '48', '49', '50', '51', '52', '53',
      'A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'A10', 'A11', 'A12', 'A13', 'A14', 'A15',
      'GND.1', 'GND.2', 'GND.3', 'GND.4', 'GND.5', '5V.1', '5V.2', '5V.3', '3.3V', 'RESET', 'VIN'
    ],
    function: 'microcontroller',
    voltageTolerance: ['5V'],
    description: 'Arduino Mega 2560 - 5V logic board',
    tagName: 'wokwi-arduino-mega'
  },
  'esp32': {
    pins: ['3V3', '5V', 'GND', 'EN', '0', '1', '2', '3', '4', '5', '12', '13', '14', '15', '16', '17', '18', '19', '21', '22', '23', '25', '26', '27', '32', '33', '34', '35', '36', '39', 'TX', 'RX', 'VP', 'VN'],
    function: 'microcontroller',
    voltageTolerance: ['3.3V'],
    description: 'ESP32 DevKit v1 - 3.3V logic board',
    tagName: 'wokwi-esp32-devkit-v1'
  },
  'esp32-devkit-v1': {
    pins: ['3V3', '5V', 'GND', 'EN', '0', '1', '2', '3', '4', '5', '12', '13', '14', '15', '16', '17', '18', '19', '21', '22', '23', '25', '26', '27', '32', '33', '34', '35', '36', '39', 'TX', 'RX', 'VP', 'VN'],
    function: 'microcontroller',
    voltageTolerance: ['3.3V'],
    description: 'ESP32 DevKit v1 - 3.3V logic board',
    tagName: 'wokwi-esp32-devkit-v1'
  },
  'esp32_devkit_v1': {
    pins: ['3V3', '5V', 'GND', 'EN', '0', '1', '2', '3', '4', '5', '12', '13', '14', '15', '16', '17', '18', '19', '21', '22', '23', '25', '26', '27', '32', '33', '34', '35', '36', '39', 'TX', 'RX', 'VP', 'VN'],
    function: 'microcontroller',
    voltageTolerance: ['3.3V'],
    description: 'ESP32 DevKit v1 - 3.3V logic board',
    tagName: 'wokwi-esp32-devkit-v1'
  },

  // Displays
  'ssd1306': {
    pins: ['DATA', 'CLK', 'VIN', '3V3', 'GND', 'RST', 'DC', 'CS'],
    function: 'display',
    voltageTolerance: ['3.3V', '5V'],
    description: 'SSD1306 OLED (I2C) - DATA is SDA, CLK is SCL',
    tagName: 'wokwi-ssd1306'
  },
  'ssd1306-i2c': {
    pins: ['DATA', 'CLK', 'VIN', '3V3', 'GND', 'RST', 'DC', 'CS'],
    function: 'display',
    voltageTolerance: ['3.3V', '5V'],
    description: 'SSD1306 OLED (I2C) - DATA is SDA, CLK is SCL',
    tagName: 'wokwi-ssd1306'
  },
  'ssd1306_i2c': {
    pins: ['DATA', 'CLK', 'VIN', '3V3', 'GND', 'RST', 'DC', 'CS'],
    function: 'display',
    voltageTolerance: ['3.3V', '5V'],
    description: 'SSD1306 OLED (I2C) - DATA is SDA, CLK is SCL',
    tagName: 'wokwi-ssd1306'
  },
  'lcd1602': {
    pins: ['SDA', 'SCL', 'VCC', 'GND'],
    function: 'display',
    voltageTolerance: ['5V'],
    description: 'LCD 16x2 (I2C) - Strictly 5V only',
    tagName: 'wokwi-lcd1602'
  },
  'lcd1602-i2c': {
    pins: ['SDA', 'SCL', 'VCC', 'GND'],
    function: 'display',
    voltageTolerance: ['5V'],
    description: 'LCD 16x2 (I2C) - Strictly 5V only',
    tagName: 'wokwi-lcd1602'
  },
  'lcd1602_i2c': {
    pins: ['SDA', 'SCL', 'VCC', 'GND'],
    function: 'display',
    voltageTolerance: ['5V'],
    description: 'LCD 16x2 (I2C) - Strictly 5V only',
    tagName: 'wokwi-lcd1602'
  },
  'lcd2004': {
    pins: ['SDA', 'SCL', 'VCC', 'GND'],
    function: 'display',
    voltageTolerance: ['5V'],
    description: 'LCD 20x4 (I2C) - Strictly 5V only',
    tagName: 'wokwi-lcd2004'
  },
  'lcd2004-i2c': {
    pins: ['SDA', 'SCL', 'VCC', 'GND'],
    function: 'display',
    voltageTolerance: ['5V'],
    description: 'LCD 20x4 (I2C) - Strictly 5V only',
    tagName: 'wokwi-lcd2004'
  },
  'lcd2004_i2c': {
    pins: ['SDA', 'SCL', 'VCC', 'GND'],
    function: 'display',
    voltageTolerance: ['5V'],
    description: 'LCD 20x4 (I2C) - Strictly 5V only',
    tagName: 'wokwi-lcd2004'
  },

  // Sensors
  'dht22': {
    pins: ['SDA', 'VCC', 'GND', 'NC'],
    function: 'temperature_humidity',
    voltageTolerance: ['3.3V', '5V'],
    description: 'DHT22 Temp/Humidity Sensor - SDA is data pin',
    tagName: 'wokwi-dht22'
  },
  'hc-sr04': {
    pins: ['VCC', 'TRIG', 'ECHO', 'GND'],
    function: 'ultrasonic',
    voltageTolerance: ['3.3V', '5V'],
    description: 'HC-SR04 Ultrasonic Sensor',
    tagName: 'wokwi-hc-sr04'
  },
  'hx711': {
    pins: ['GND', 'VCC', 'SCK', 'DT'],
    function: 'load_cell_amplifier',
    voltageTolerance: ['3.3V', '5V'],
    description: 'HX711 Load Cell Amp - DT is data, SCK is clock',
    tagName: 'wokwi-hx711'
  },
  'mpu6050': {
    pins: ['SDA', 'SCL', 'VCC', 'GND', 'INT', 'AD0', 'XCL', 'XDA'],
    function: 'imu',
    voltageTolerance: ['3.3V'],
    description: 'MPU6050 Accelerometer/Gyroscope',
    tagName: 'wokwi-mpu6050'
  },
  'ds1307': {
    pins: ['SDA', 'SCL', '5V', 'GND', 'SQW'],
    function: 'rtc',
    voltageTolerance: ['5V'],
    description: 'DS1307 Real-Time Clock - Strictly 5V',
    tagName: 'wokwi-ds1307'
  },

  // Inputs
  'pushbutton': {
    pins: ['1.l', '2.l', '1.r', '2.r'],
    function: 'input',
    voltageTolerance: ['3.3V', '5V'],
    description: 'Tactile Pushbutton Switch',
    tagName: 'wokwi-pushbutton'
  },
  'push_button': {
    pins: ['1.l', '2.l', '1.r', '2.r'],
    function: 'input',
    voltageTolerance: ['3.3V', '5V'],
    description: 'Tactile Pushbutton Switch',
    tagName: 'wokwi-pushbutton'
  },
  'potentiometer': {
    pins: ['SIG', 'VCC', 'GND'],
    function: 'input',
    voltageTolerance: ['3.3V', '5V'],
    description: 'Rotary Potentiometer',
    tagName: 'wokwi-potentiometer'
  },

  // Motors & Actuators
  'servo': {
    pins: ['PWM', 'V+', 'GND'],
    function: 'actuator',
    voltageTolerance: ['5V'],
    description: 'Servo Motor - V+ is power, PWM is control',
    tagName: 'wokwi-servo'
  },
  'buzzer': {
    pins: ['1', '2'],
    function: 'actuator',
    voltageTolerance: ['3.3V', '5V'],
    description: 'Piezo Buzzer',
    tagName: 'wokwi-buzzer'
  },

  // Passives & Other
  'led': {
    pins: ['A', 'C'],
    function: 'indicator',
    voltageTolerance: ['3.3V', '5V'],
    description: 'Standard LED (A anode, C cathode)',
    tagName: 'wokwi-led'
  },
  'rgb-led': {
    pins: ['R', 'G', 'B', 'COM'],
    function: 'indicator',
    voltageTolerance: ['3.3V', '5V'],
    description: 'RGB LED (COM common terminal)',
    tagName: 'wokwi-rgb-led'
  },
  'resistor': {
    pins: ['1', '2'],
    function: 'passive',
    voltageTolerance: ['3.3V', '5V'],
    description: 'Resistor',
    tagName: 'wokwi-resistor'
  },
  'microsd-card': {
    pins: ['DI', 'DO', 'SCK', 'CS', 'VCC', 'GND', 'CD'],
    function: 'storage',
    voltageTolerance: ['3.3V', '5V'],
    description: 'microSD Card Module - SPI interface',
    tagName: 'wokwi-microsd-card'
  }
};
