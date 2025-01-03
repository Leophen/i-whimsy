import { DatePicker } from '@arco-design/web-react';
import { UsualContent } from '../ToolContent/UsualContent';
import { useState } from 'react';
import dayjs from 'dayjs';
import { useMemo } from 'react';
import { Statistic } from '@arco-design/web-react';
import { Button } from '@arco-design/web-react';
import { IconSwap } from '@arco-design/web-react/icon';
import { Tooltip } from '@arco-design/web-react';

export const TimeCompute = () => {
  const [value, setValue] = useState({
    start: dayjs().format('YYYY-MM-DD'),
    end: dayjs().format('YYYY-MM-DD'),
  });

  const [pickerValue, setPickerValue] = useState({
    start: dayjs().format('YYYY-MM-DD'),
    end: dayjs().format('YYYY-MM-DD'),
  });

  const differenceDate = useMemo(() => {
    return {
      year: dayjs(value.end).diff(dayjs(value.start), 'year'),
      month: dayjs(value.end).diff(dayjs(value.start), 'month'),
      week: dayjs(value.end).diff(dayjs(value.start), 'week'),
      day: dayjs(value.end).diff(dayjs(value.start), 'day'),
      hour: dayjs(value.end).diff(dayjs(value.start), 'hour'),
      minute: dayjs(value.end).diff(dayjs(value.start), 'minute'),
      second: dayjs(value.end).diff(dayjs(value.start), 'second'),
    };
  }, [value.start, value.end]);

  const handleExchange = () => {
    setValue({
      start: pickerValue.end,
      end: pickerValue.start,
    });

    setPickerValue({
      start: pickerValue.end,
      end: pickerValue.start,
    });
  };

  return (
    <UsualContent>
      <div className="tool-container">
        <section className="tool-time-compute-wrap">
          <section className="tool-time-compute-panel-wrap">
            <div className="tool-time-compute-panel-item">
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

            <div className="tool-time-compute-panel-item middle">
              <Tooltip content="交换日期">
                <Button
                  shape="circle"
                  type="primary"
                  icon={<IconSwap />}
                  onClick={handleExchange}
                />
              </Tooltip>
            </div>

            <div className="tool-time-compute-panel-item">
              <h4>截止时间</h4>
              <p>{value.end || '请选择截止时间'}</p>
              <DatePicker
                triggerElement={null}
                style={{ width: 268 }}
                value={value.end}
                onChange={(v) => {
                  value.end = v;
                  setValue({ ...value });
                }}
                pickerValue={pickerValue.end}
                onPickerValueChange={(v) => {
                  value.end = v;
                  setPickerValue({ ...value });
                }}
              />
            </div>
          </section>

          <div className="top24 flex gap36 start">
            <Statistic
              title="前后相差年数"
              value={differenceDate.year}
              groupSeparator
            />
            <Statistic
              title="前后相差月数"
              value={differenceDate.month}
              groupSeparator
            />
            <Statistic
              title="前后相差周数"
              value={differenceDate.week}
              groupSeparator
            />
            <Statistic
              title="前后相差天数"
              value={differenceDate.day}
              groupSeparator
            />
            <Statistic
              title="前后相差小时"
              value={differenceDate.hour}
              groupSeparator
            />
            <Statistic
              title="前后相差分钟"
              value={differenceDate.minute}
              groupSeparator
            />
            <Statistic
              title="前后相差秒数"
              value={differenceDate.second}
              groupSeparator
            />
          </div>
        </section>
      </div>
    </UsualContent>
  );
};
