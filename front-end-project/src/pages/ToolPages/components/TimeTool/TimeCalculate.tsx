import { DatePicker } from '@arco-design/web-react';
import { UsualContent } from '../ToolContent/UsualContent';
import { useState } from 'react';
import dayjs from 'dayjs';
import { InputNumber } from '@arco-design/web-react';
import { Select } from '@arco-design/web-react';

const Option = Select.Option;
const unitOptions = [
  {
    label: '天',
    value: 'day',
  },
  {
    label: '周',
    value: 'week',
  },
  {
    label: '月',
    value: 'month',
  },
  {
    label: '年',
    value: 'year',
  },
];

export const TimeCalculate = () => {
  const [value, setValue] = useState({
    start: dayjs().format('YYYY-MM-DD'),
    end: dayjs().format('YYYY-MM-DD'),
  });

  const [pickerValue, setPickerValue] = useState({
    start: dayjs().format('YYYY-MM-DD'),
    end: dayjs().format('YYYY-MM-DD'),
  });

  const [unit, setUnit] = useState('day');
  const [calculateVal, setCalculateVal] = useState(0);

  const handleCalculate = (v: number) => {
    const newDate = dayjs(value.start).add(v, unit).format('YYYY-MM-DD');
    if (dayjs(newDate).isValid()) {
      setValue({
        ...value,
        end: newDate,
      });
    }
    setCalculateVal(v);
  };

  const handleSelectUnit = (v: dayjs.ManipulateType) => {
    const newDate = dayjs(value.start)
      .add(calculateVal, v)
      .format('YYYY-MM-DD');
    if (dayjs(newDate).isValid()) {
      setValue({
        ...value,
        end: newDate,
      });
    }
    setUnit(v);
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
                const newDate = dayjs(v)
                  .add(calculateVal, unit)
                  .format('YYYY-MM-DD');
                if (dayjs(newDate).isValid()) {
                  setValue({
                    ...value,
                    end: newDate,
                  });
                }

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
            <h4>推算单位</h4>
            <div className="tool-time-calculate-btn-wrap-inner">
              <Select value={unit} onChange={handleSelectUnit}>
                {unitOptions.map((option, index) => (
                  <Option
                    key={option.value}
                    disabled={index === 4}
                    value={option.value}
                  >
                    {option.label}
                  </Option>
                ))}
              </Select>

              <InputNumber
                mode="button"
                size="mini"
                className="tool-time-calculate-btn"
                value={calculateVal}
                onChange={handleCalculate}
              />
            </div>
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
