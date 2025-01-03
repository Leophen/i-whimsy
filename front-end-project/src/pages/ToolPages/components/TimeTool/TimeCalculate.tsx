import { DatePicker } from '@arco-design/web-react';
import { UsualContent } from '../ToolContent/UsualContent';
import { useState } from 'react';
import dayjs from 'dayjs';
import { InputNumber } from '@arco-design/web-react';

export const TimeCalculate = () => {
  const [value, setValue] = useState({
    start: dayjs().format('YYYY-MM-DD'),
    end: dayjs().format('YYYY-MM-DD'),
  });

  const [pickerValue, setPickerValue] = useState({
    start: dayjs().format('YYYY-MM-DD'),
    end: dayjs().format('YYYY-MM-DD'),
  });

  const [calculateVal, setCalculateVal] = useState(0);
  const handleCalculate = (v: number) => {
    const newDate = dayjs(value.start).add(v, 'day').format('YYYY-MM-DD');
    if (dayjs(newDate).isValid()) {
      setValue({
        ...value,
        end: newDate,
      });
    }
    setCalculateVal(v);
  };

  return (
    <UsualContent>
      <div className="tool-container">
        <section className="tool-time-calculate-wrap">
          <div className="tool-time-calculate-panel-item">
            <h4>开始时间</h4>
            <p>{value.start || '请选择开始时间'}</p>
            <DatePicker
              triggerElement={null}
              style={{ width: 268 }}
              value={value.start}
              onChange={(v) => {
                value.start = v;
                setValue({ ...value });
              }}
              pickerValue={pickerValue.start}
              onPickerValueChange={(v) => {
                value.start = v;
                setPickerValue({ ...value });
              }}
            />
          </div>

          <div className="tool-time-calculate-btn-wrap">
            <InputNumber
              mode="button"
              className="tool-time-calculate-btn"
              value={calculateVal}
              onChange={handleCalculate}
            />
          </div>

          <div className="top24">
            <h4>推算时间</h4>
            <p>{value.end ?? ''}</p>
          </div>
        </section>
      </div>
    </UsualContent>
  );
};
