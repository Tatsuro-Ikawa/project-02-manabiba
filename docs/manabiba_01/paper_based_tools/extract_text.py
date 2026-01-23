#!/usr/bin/env python
# -*- coding: utf-8 -*-
import xml.etree.ElementTree as ET
import re
import sys

def extract_text_from_word_xml(xml_file):
    """Word XMLファイルからテキストを抽出"""
    try:
        # XMLファイルをパース
        tree = ET.parse(xml_file)
        root = tree.getroot()
        
        # 名前空間を定義
        namespaces = {
            'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
            'pkg': 'http://schemas.microsoft.com/office/2006/xmlPackage'
        }
        
        # すべてのテキスト要素を取得
        text_elements = root.findall('.//w:t', namespaces)
        
        # テキストを結合
        all_text = []
        for elem in text_elements:
            if elem.text:
                all_text.append(elem.text)
        
        full_text = ''.join(all_text)
        
        # キーワードを含む部分を検索
        keywords = ['ステップ', '日目', 'ワーク', 'シート', 'コーチング', 'プログラム', '7日間', '28日間', '自分を変える']
        
        print("=" * 80)
        print("XMLファイルから抽出したテキストの概要")
        print("=" * 80)
        print(f"\n総文字数: {len(full_text)}")
        print(f"テキスト要素数: {len(text_elements)}")
        
        print("\n" + "=" * 80)
        print("キーワード検索結果")
        print("=" * 80)
        
        for keyword in keywords:
            matches = [m.start() for m in re.finditer(keyword, full_text)]
            if matches:
                print(f"\n【{keyword}】が見つかりました ({len(matches)}箇所)")
                # 最初の3つのマッチの前後100文字を表示
                for i, pos in enumerate(matches[:3]):
                    start = max(0, pos - 100)
                    end = min(len(full_text), pos + 100)
                    context = full_text[start:end]
                    print(f"\n  マッチ {i+1} (位置 {pos}):")
                    print(f"  ...{context}...")
        
        # 最初の5000文字を表示
        print("\n" + "=" * 80)
        print("ファイルの先頭部分（最初の5000文字）")
        print("=" * 80)
        print(full_text[:5000])
        
        # 最後の5000文字を表示
        print("\n" + "=" * 80)
        print("ファイルの末尾部分（最後の5000文字）")
        print("=" * 80)
        print(full_text[-5000:])
        
        return full_text
        
    except Exception as e:
        print(f"エラーが発生しました: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return None

if __name__ == "__main__":
    xml_file = "01_ワーキングシート_v0.62.xml"
    extract_text_from_word_xml(xml_file)
