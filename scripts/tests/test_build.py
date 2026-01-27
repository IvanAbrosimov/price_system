"""
Тесты для build.py
"""
import pytest
import sys
import os

# Добавляем путь к скриптам
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from build import (
    determine_lead_time,
    get_margin,
    calculate_client_price,
    clean,
    safe_float
)


class TestLeadTime:
    """Тесты для функции determine_lead_time"""
    
    def test_astana_enough(self):
        """Если есть в Астане → 6-10 дней"""
        astana = {'art1': 14}
        almaty = {'art1': 2}
        assert determine_lead_time('art1', almaty, astana) == "6-10 дней"
    
    def test_astana_only(self):
        """Только в Астане → 6-10 дней"""
        astana = {'art1': 5}
        almaty = {}
        assert determine_lead_time('art1', almaty, astana) == "6-10 дней"
    
    def test_almaty_only(self):
        """Только в Алматы → 10-14 дней"""
        astana = {}
        almaty = {'art1': 10}
        assert determine_lead_time('art1', almaty, astana) == "10-14 дней"
    
    def test_combined_stock(self):
        """Сумма складов > 0 → 10-14 дней"""
        astana = {'art1': 0}
        almaty = {'art1': 5}
        assert determine_lead_time('art1', almaty, astana) == "10-14 дней"
    
    def test_no_stock(self):
        """Нигде нет → по запросу"""
        astana = {}
        almaty = {}
        assert determine_lead_time('art1', almaty, astana) == "по запросу"
    
    def test_zero_both(self):
        """Нули везде → по запросу"""
        astana = {'art1': 0}
        almaty = {'art1': 0}
        assert determine_lead_time('art1', almaty, astana) == "по запросу"
    
    def test_article_not_found(self):
        """Артикул не найден → по запросу"""
        astana = {'other': 10}
        almaty = {'other': 10}
        assert determine_lead_time('art1', almaty, astana) == "по запросу"


class TestPriceCalculation:
    """Тесты для расчета цен"""
    
    def test_basic_price(self):
        """Базовый расчет цены"""
        # dealer_price=6000, margin=60%, kurs=5
        # (6000 * 1.6) / 5 = 1920
        margins_dict = {
            'global_margin': 0.6,
            'by_manufacturer': {},
            'by_article': {}
        }
        result = calculate_client_price(6000, 'art1', 'Jung', 5, margins_dict)
        assert result == 1920
    
    def test_price_with_manufacturer_margin(self):
        """Цена с маржой по производителю"""
        margins_dict = {
            'global_margin': 0.6,
            'by_manufacturer': {'Jung': 0.5},  # 50% вместо 60%
            'by_article': {}
        }
        # (6000 * 1.5) / 5 = 1800
        result = calculate_client_price(6000, 'art1', 'Jung', 5, margins_dict)
        assert result == 1800
    
    def test_price_with_article_margin(self):
        """Цена с маржой по артикулу (приоритет)"""
        margins_dict = {
            'global_margin': 0.6,
            'by_manufacturer': {'Jung': 0.5},
            'by_article': {'art1': 0.4}  # 40% - приоритет над производителем
        }
        # (6000 * 1.4) / 5 = 1680
        result = calculate_client_price(6000, 'art1', 'Jung', 5, margins_dict)
        assert result == 1680
    
    def test_price_rounding(self):
        """Округление цены до целого"""
        margins_dict = {
            'global_margin': 0.6,
            'by_manufacturer': {},
            'by_article': {}
        }
        # (1000 * 1.6) / 3 = 533.33... → 533
        result = calculate_client_price(1000, 'art1', 'Jung', 3, margins_dict)
        assert result == 533


class TestMargin:
    """Тесты для функции get_margin"""
    
    def test_global_margin(self):
        """Глобальная маржа по умолчанию"""
        margins_dict = {
            'global_margin': 0.6,
            'by_manufacturer': {},
            'by_article': {}
        }
        assert get_margin('art1', 'Jung', margins_dict) == 0.6
    
    def test_manufacturer_margin(self):
        """Маржа по производителю"""
        margins_dict = {
            'global_margin': 0.6,
            'by_manufacturer': {'Jung': 0.5},
            'by_article': {}
        }
        assert get_margin('art1', 'Jung', margins_dict) == 0.5
    
    def test_article_margin_priority(self):
        """Маржа по артикулу имеет приоритет"""
        margins_dict = {
            'global_margin': 0.6,
            'by_manufacturer': {'Jung': 0.5},
            'by_article': {'art1': 0.4}
        }
        assert get_margin('art1', 'Jung', margins_dict) == 0.4
    
    def test_unknown_manufacturer(self):
        """Неизвестный производитель → глобальная маржа"""
        margins_dict = {
            'global_margin': 0.6,
            'by_manufacturer': {'Jung': 0.5},
            'by_article': {}
        }
        assert get_margin('art1', 'Unknown', margins_dict) == 0.6


class TestHelpers:
    """Тесты вспомогательных функций"""
    
    def test_clean_string(self):
        """Очистка строки от пробелов"""
        assert clean("  hello  ") == "hello"
        assert clean("test") == "test"
    
    def test_clean_non_string(self):
        """Очистка не-строки"""
        assert clean(123) == 123
        assert clean(None) is None
    
    def test_safe_float_number(self):
        """Преобразование числа"""
        assert safe_float(123) == 123.0
        assert safe_float(123.45) == 123.45
    
    def test_safe_float_string(self):
        """Преобразование строки в число"""
        assert safe_float("123") == 123.0
        assert safe_float("123.45") == 123.45
    
    def test_safe_float_invalid(self):
        """Невалидные значения"""
        assert safe_float("abc") is None
        assert safe_float(None) is None
    
    def test_safe_float_nan(self):
        """NaN значения"""
        import pandas as pd
        assert safe_float(pd.NA) is None


class TestExamplesFromTZ:
    """Тесты примеров из ТЗ"""
    
    def test_ls1520_astana_14_almaty_2_order_14(self):
        """LS1520: Астана=14, Алматы=2, Заказ=14 → 6-10 дней (проверка по наличию)"""
        astana = {'ls1520': 14}
        almaty = {'ls1520': 2}
        # Функция determine_lead_time проверяет только наличие, не количество заказа
        assert determine_lead_time('ls1520', almaty, astana) == "6-10 дней"
    
    def test_wago_default_lead_time(self):
        """Wago всегда 10-14 дней (нет на локальных складах)"""
        astana = {}
        almaty = {}
        # Wago нет на наших складах, но срок задается вручную
        assert determine_lead_time('wago123', almaty, astana) == "по запросу"


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
